// The deck: turns a book's data (data/<book>.js, built by pipeline/build.py) into words and cards.
// Pure, no DOM. Unit-tested in test/deck.test.mjs.
//
// Per vocabulary word (not names, not prefixes/suffixes):
//   recall  the dictionary form → what does it mean?            (meet, with ctx)
//   ctx     a verse with one occurrence highlighted → meaning?   (meet)
//   form    up to two other spellings of it in the book          (deepen, once graduated)
//   which   a verse occurrence → pick the gloss among look-alikes (tell apart, once graduated)
//   write   a verse with the word blanked + its English → write the Hebrew on the pad (deepen, once the word
//           has been read in its verse `writeAfter` times; Settings). Never on a written/read place (asking for
//           "the word" there would pick one reading), and never with the answer visible elsewhere in the verse.
//
// A card that shows a verse has a `pool` of the places it can show, and each review takes the next one
// (`variantFor`), so a word is seen across its verses rather than in the same one every time (Steve, 2026-10-24).
// The card's id, and so its schedule, stays the same whichever verse it shows. In-verse cards rotate through the
// spellings no "Another form" card claims; each form card through the verses with its spelling.

export const KIND_LABEL = { recall: 'Word → meaning', ctx: 'In its verse', form: 'Another form', which: 'Which word?', write: 'Write the Hebrew' };
const MAX_FORM_CARDS = 2;

export function plain(s) {
  // Strip every Hebrew mark (cantillation, points, maqqef aside) for search and comparison.
  return String(s || '').normalize('NFC').replace(/[֑-ׇ]/g, m => (m === '־' ? '־' : '')).replace(/͏/g, '');
}

export function indexBook(data) {
  const tokens = new Map();
  const verseOf = new Map();
  for (const v of data.verses) for (const t of v.t) { t.ref = v.ref; tokens.set(t.id, t); verseOf.set(t.id, v); }
  const verses = new Map(data.verses.map(v => [v.ref, v]));
  const lexemes = new Map(Object.entries(data.lexemes).map(([id, r]) => [id, { id, ...r }]));
  const chapters = [...new Set(data.verses.map(v => v.c))];
  const chapterOf = ref => Number(String(ref).split('.')[0]);
  const vocab = [...lexemes.values()].filter(l => !l.affix && !l.name && l.n > 0);
  // Introduction order: chapter of first appearance, then frequency in the book (most frequent first), then key.
  vocab.sort((a, b) => chapterOf(a.first) - chapterOf(b.first) || b.n - a.n || a.id.localeCompare(b.id));
  vocab.forEach((l, i) => { l.order = i; });
  const names = [...lexemes.values()].filter(l => l.name && l.n > 0)
    .sort((a, b) => b.n - a.n || a.gloss.localeCompare(b.gloss));
  return { data, tokens, verseOf, verses, lexemes, chapters, chapterOf, vocab, names };
}

// Occurrences, preferring ordinary tokens over written/read variants (those are taught in their own view).
export function occurrences(book, lex) {
  const all = (lex.occ || []).map(id => book.tokens.get(id)).filter(Boolean);
  const plainOnes = all.filter(t => !t.kq);
  return plainOnes.length ? plainOnes : all.filter(t => t.kq === 'q').concat(all.filter(t => t.kq === 'k'));
}

// Distinct surface forms of a lexeme in the book (by pointed text), each with every token that has it.
export function formsOf(book, lex) {
  const by = new Map();
  for (const id of lex.occ || []) {
    const t = book.tokens.get(id);
    if (!t) continue;
    const key = t.p;
    if (!by.has(key)) by.set(key, { text: t.p, cons: t.c, parse: t.parse, kq: t.kq || null, tokens: [] });
    by.get(key).tokens.push(t);
  }
  return [...by.values()];
}

const words = s => new Set(String(s).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w)));
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// Three look-alike distractors: same part of speech, closest consonantal spelling, and no gloss overlap
// (a distractor that could also be right would make the card unfair).
export function distractorsFor(book, lex, n = 3) {
  const ans = words(lex.gloss + ' ' + (lex.def || ''));
  const cands = book.vocab.filter(o => o.id !== lex.id
    && o.gloss.toLowerCase() !== lex.gloss.toLowerCase()
    && ![...words(o.gloss + ' ' + (o.def || ''))].some(w => ans.has(w)));
  const score = o => (o.pos === lex.pos ? 0 : 10) + editDistance(plain(o.he).replace(/־/g, ''), plain(lex.he).replace(/־/g, ''));
  return cands.map(o => ({ o, s: score(o) })).sort((a, b) => a.s - b.s || a.o.order - b.o.order).slice(0, n).map(x => x.o);
}

// The list rotated to start at index i (the place a card has always shown first stays first).
const rotate = (list, i) => list.slice(i).concat(list.slice(0, i));

// The places a Write the Hebrew card can blank the word: verses in which it occurs once, outside any written/read
// place, and in which no other word has the same spelling (3:18 has כִּי "that" beside the כִּי of כִּי אִם "except").
// Failing that, every plain occurrence, with each such token in its verse blanked too (`blank`), plus the whole
// written/read group where one is involved. A word found only at written/read places gets no Write card.
export function writeTargets(book, lex) {
  const plainOcc = (lex.occ || []).map(id => book.tokens.get(id)).filter(t => t && !t.kq);
  if (!plainOcc.length) return [];
  const others = t => book.verseOf.get(t.id).t.filter(x => x.id !== t.id && (x.lex === lex.id || x.c === t.c));
  const lone = plainOcc.filter(t => !others(t).length);
  if (lone.length) return rotate(lone, Math.min(2, lone.length - 1)).map(t => ({ token: t.id }));
  return rotate(plainOcc, Math.min(2, plainOcc.length - 1)).map(t => {
    const blank = new Set();
    for (const x of others(t)) { blank.add(x.id); (x.pair || []).forEach(id => blank.add(id)); }
    return { token: t.id, blank: [...blank] };
  });
}
export const writeTarget = (book, lex) => writeTargets(book, lex)[0] || null;

// The card as shown at its `reps`-th review: the pool's next place over its own token (or hint verse).
export function variantFor(card, reps = 0) {
  if (!card.pool || card.pool.length < 2) return card;
  return { ...card, blank: undefined, ...card.pool[reps % card.pool.length] };
}

export function buildDeck(book) {
  const cards = [];
  for (const lex of book.vocab) {
    const occ = occurrences(book, lex);
    if (!occ.length) continue;
    const base = { item: lex };
    const ctxTok = occ[0];
    const seen = new Set([ctxTok.c]);
    const formToks = [];
    for (const t of occ.slice(1)) {
      if (formToks.length >= MAX_FORM_CARDS) break;
      if (seen.has(t.c)) continue;
      seen.add(t.c);
      formToks.push(t);
    }
    const formSpellings = new Set(formToks.map(t => t.c));
    const ctxPool = occ.filter(t => !formSpellings.has(t.c)).map(t => ({ token: t.id }));
    cards.push({ ...base, id: `${lex.id}:recall`, kind: 'recall', hintToken: ctxTok.id, pool: occ.map(t => ({ hintToken: t.id })) });
    cards.push({ ...base, id: `${lex.id}:ctx`, kind: 'ctx', token: ctxTok.id, pool: ctxPool });
    for (const t of formToks) {
      const same = occ.filter(x => x.c === t.c);
      cards.push({ ...base, id: `${lex.id}:form:${t.id}`, kind: 'form', token: t.id, pool: rotate(same, same.indexOf(t)).map(x => ({ token: x.id })) });
    }
    const writes = writeTargets(book, lex);
    if (writes.length) cards.push({ ...base, id: `${lex.id}:write`, kind: 'write', ...writes[0], pool: writes });
    const distractors = distractorsFor(book, lex);
    if (distractors.length === 3) {
      const whichPool = rotate(occ, occ.length > 1 ? 1 : 0).map(t => ({ token: t.id }));
      cards.push({ ...base, id: `${lex.id}:which`, kind: 'which', ...whichPool[0], pool: whichPool, distractors: distractors.map(d => d.id) });
    }
  }
  return cards;
}
