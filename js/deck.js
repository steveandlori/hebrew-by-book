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

// Where a Write the Hebrew card blanks the word: a verse in which it occurs once, outside any written/read place,
// and in which no other word has the same spelling (3:18 has כִּי "that" beside the כִּי of כִּי אִם "except").
// Failing that, every such token in the chosen verse is blanked too (`blank`), with the whole written/read group
// where one is involved. A word found only at written/read places gets no Write card.
export function writeTarget(book, lex) {
  const plainOcc = (lex.occ || []).map(id => book.tokens.get(id)).filter(t => t && !t.kq);
  if (!plainOcc.length) return null;
  const others = t => book.verseOf.get(t.id).t.filter(x => x.id !== t.id && (x.lex === lex.id || x.c === t.c));
  const lone = plainOcc.filter(t => !others(t).length);
  if (lone.length) return { token: lone[Math.min(2, lone.length - 1)].id };
  const t = plainOcc[Math.min(2, plainOcc.length - 1)];
  const blank = new Set();
  for (const x of others(t)) { blank.add(x.id); (x.pair || []).forEach(id => blank.add(id)); }
  return { token: t.id, blank: [...blank] };
}

export function buildDeck(book) {
  const cards = [];
  for (const lex of book.vocab) {
    const occ = occurrences(book, lex);
    if (!occ.length) continue;
    const base = { item: lex };
    const ctxTok = occ[0];
    cards.push({ ...base, id: `${lex.id}:recall`, kind: 'recall', hintToken: ctxTok.id });
    cards.push({ ...base, id: `${lex.id}:ctx`, kind: 'ctx', token: ctxTok.id });
    const seen = new Set([ctxTok.c]);
    let forms = 0;
    for (const t of occ.slice(1)) {
      if (forms >= MAX_FORM_CARDS) break;
      if (seen.has(t.c)) continue;
      seen.add(t.c);
      cards.push({ ...base, id: `${lex.id}:form:${t.id}`, kind: 'form', token: t.id });
      forms++;
    }
    const write = writeTarget(book, lex);
    if (write) cards.push({ ...base, id: `${lex.id}:write`, kind: 'write', ...write });
    const whichTok = occ[1] || occ[0];
    const distractors = distractorsFor(book, lex);
    if (distractors.length === 3) cards.push({ ...base, id: `${lex.id}:which`, kind: 'which', token: whichTok.id, distractors: distractors.map(d => d.id) });
  }
  return cards;
}
