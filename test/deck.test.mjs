// Checks the generated deck for Ruth against the built data (data/ruth.js).
import { makeRenderer } from '../js/render.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ruth from '../data/ruth.js';
import { indexBook, buildDeck, plain, formsOf, occurrences, distractorsFor } from '../js/deck.js';

const book = indexBook(ruth);
const deck = buildDeck(book);

test('Ruth has 85 verses and every token and segment belongs to a lexeme in the data', () => {
  assert.equal(book.verses.size, 85);
  for (const t of book.tokens.values()) {
    assert.ok(book.lexemes.has(t.lex), t.id);
    for (const s of t.segs) assert.ok(book.lexemes.has(s.x), `${t.id} ${s.x}`);
  }
});
test('vocabulary excludes names and prefixes/suffixes; names include the people of Ruth', () => {
  assert.ok(book.vocab.every(l => !l.name && !l.affix));
  const names = book.names.map(l => l.gloss);
  for (const n of ['Ruth', 'Naomi', 'Boaz', 'Orpah', 'Elimelech']) assert.ok(names.includes(n), n);
});
test('vocabulary is ordered by chapter of first appearance', () => {
  const ch = book.vocab.map(l => book.chapterOf(l.first));
  assert.deepEqual(ch, [...ch].sort((a, b) => a - b));
});
test('every vocabulary word has a recall and an in-verse card, and card ids are unique', () => {
  const ids = new Set(deck.map(c => c.id));
  assert.equal(ids.size, deck.length);
  for (const l of book.vocab) {
    assert.ok(ids.has(`${l.id}:recall`), l.id);
    assert.ok(ids.has(`${l.id}:ctx`), l.id);
  }
});
test('every card that points at a token points at an occurrence of its own word', () => {
  for (const c of deck) {
    for (const tid of [c.token, c.hintToken].filter(Boolean)) {
      const t = book.tokens.get(tid);
      assert.ok(t, `${c.id} -> ${tid}`);
      assert.equal(t.lex, c.item.id, c.id);
    }
  }
});
test('no more than two form cards per word, each a different spelling', () => {
  const by = new Map();
  for (const c of deck.filter(c => c.kind === 'form')) {
    by.set(c.item.id, [...(by.get(c.item.id) || []), book.tokens.get(c.token).c]);
  }
  for (const [id, forms] of by) {
    assert.ok(forms.length <= 2, id);
    assert.equal(new Set(forms).size, forms.length, id);
  }
});
test('Which word? distractors are other vocabulary words with a different gloss', () => {
  for (const c of deck.filter(c => c.kind === 'which')) {
    assert.equal(c.distractors.length, 3);
    assert.ok(!c.distractors.includes(c.item.id));
    for (const d of c.distractors) {
      const o = book.lexemes.get(d);
      assert.ok(o && !o.name && !o.affix, d);
      assert.notEqual(o.gloss.toLowerCase(), c.item.gloss.toLowerCase());
    }
  }
});
test('plain() strips points and cantillation but keeps maqqef', () => {
  assert.equal(plain('וַיְהִ֗י'), 'ויהי');
  assert.equal(plain('אֶל־'), 'אל־');
});
test('a word known only from a qere reading still gets cards (מוֹדַע, 2:1)', () => {
  const l = book.lexemes.get('H4129');
  assert.ok(l && !l.name);
  assert.equal(occurrences(book, l)[0].kq, 'q');
  assert.ok(deck.some(c => c.id === 'H4129:recall'));
});
test('forms group every occurrence by spelling', () => {
  const l = book.lexemes.get('H559');
  assert.equal(formsOf(book, l).reduce((a, f) => a + f.tokens.length, 0), l.n);
});
test('distractorsFor is deterministic', () => {
  const l = book.vocab[5];
  assert.deepEqual(distractorsFor(book, l).map(x => x.id), distractorsFor(book, l).map(x => x.id));
});

test('Write the Hebrew: one card per word, never on a written/read place, answer never visible in the verse', () => {
  const R = makeRenderer({ lexemes: book.lexemes, isPointed: () => true, stageOf: () => 'new' });
  for (const l of book.vocab) {
    const ws = deck.filter(c => c.item.id === l.id && c.kind === 'write');
    const plainOcc = l.occ.filter(id => !book.tokens.get(id).kq);
    assert.equal(ws.length, plainOcc.length ? 1 : 0, l.id);   // words only at written/read places get none
    if (!ws.length) continue;
    const c = ws[0], t = book.tokens.get(c.token), v = book.verseOf.get(c.token);
    assert.ok(!t.kq, l.id);
    const blank = c.blank ? [c.token, ...c.blank] : c.token;
    const html = R.verseHTML(v, { blank, tappable: true });   // tappable words carry their token id
    for (const x of v.t) if (x.lex === l.id) assert.ok(!html.includes(`data-tok="${x.id}"`), `${l.id} ${v.ref} shows ${x.p}`);
  }
  // the three words found only at written/read places in Ruth
  for (const id of ['H2962', 'H8071', 'H4129']) assert.ok(!deck.some(c => c.id === `${id}:write`), id);
});
