// Verse rendering against the real Ruth data: written/read places in both modes, maqqef joins, escaping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ruth from '../data/ruth.js';
import { indexBook } from '../js/deck.js';
import { makeRenderer, affixGloss, esc, shortParse } from '../js/render.js';
import { allowances } from '../js/guide.js';

const book = indexBook(ruth);
let pointedMode = true;
const R = makeRenderer({ lexemes: book.lexemes, isPointed: () => pointedMode, stageOf: () => 'new' });
const verse = ref => R.verseHTML(book.verses.get(ref));
const groups = html => html.match(/<span class="kq[^"]*"[\s\S]*?<\/sup>(?:<span class="kq-alt">[\s\S]*?<\/span><\/span>)?/g) || [];

test('3:3 has two written/read groups; pointed mode leads with the read form and marks it ק', () => {
  pointedMode = true;
  const h = verse('3.3');
  assert.equal((h.match(/class="kq"/g) || []).length, 2);
  assert.equal((h.match(/class="kq-mark"[^>]*>ק</g) || []).length, 2);
  assert.ok(h.includes('וירדתי') && h.includes('וְיָרַדְתְּ'));
  assert.ok(h.indexOf('וְיָרַדְתְּ') < h.indexOf('וירדתי'), 'read form leads, written form follows in brackets');
});
test('unpointed mode leads with the written consonants and marks them כ', () => {
  pointedMode = false;
  const h = verse('3.3');
  assert.equal((h.match(/class="kq-mark"[^>]*>כ</g) || []).length, 2);
  assert.ok(h.indexOf('וירדתי') < h.indexOf('וירדת<'), 'written form leads');
  pointedMode = true;
});
test('3:12 written-not-read and 3:5 read-not-written render as lone places in both modes', () => {
  for (const m of [true, false]) {
    pointedMode = m;
    assert.match(verse('3.12'), /kq kq-lone" title="written, not read"/);
    assert.match(verse('3.5'), /kq kq-lone" title="read, not written"/);
  }
  pointedMode = true;
});
test('4:6: the maqqef after a written/read place follows the whole group, then no space before the next word', () => {
  for (const m of [true, false]) {
    pointedMode = m;
    const h = verse('4.6');
    const i = h.indexOf('<span class="mq">־</span></span>');
    assert.ok(i > 0, 'maqqef after the group');
    assert.notEqual(h[i + '<span class="mq">־</span></span>'.length], ' ', 'no space after a maqqef');
    const kq = h.slice(h.lastIndexOf('<span class="kq', i), i);
    assert.ok(!kq.includes('־'), 'no maqqef inside the group');
  }
  pointedMode = true;
});
test('ordinary maqqef joins stay tight (1:1 has none inside words, 1:8 has one)', () => {
  const h = verse('1.8');
  assert.ok(/־<\/span><\/span><span class="w">/.test(h), 'maqqef word followed directly by the next word');
});
test('every token appears exactly once per verse across the book', () => {
  for (const m of [true, false]) {
    pointedMode = m;
    for (const v of ruth.verses) {
      const h = R.verseHTML(v, { tappable: true });
      for (const t of v.t) assert.equal(h.split(`data-tok="${t.id}"`).length - 1, 1, `${v.ref} ${t.id}`);
    }
  }
  pointedMode = true;
});
test('affix glosses: brackets dropped, grammatical notes hidden', () => {
  assert.equal(affixGloss('[the]'), 'the');
  assert.equal(affixGloss('[emph.?]'), '');
  assert.equal(affixGloss('[?]'), '');
  assert.equal(affixGloss('and'), 'and');
});
test('esc escapes HTML', () => { assert.equal(esc('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;'); });

test('allowances count new words by recall cards and extra cards by form/which', () => {
  assert.deepEqual(allowances([], 10), { words: 10, extra: 10 });
  const ids = ['H1:recall', 'H1:ctx', 'H2:recall', 'H3:form:08abc', 'H4:which'];
  assert.deepEqual(allowances(ids, 10), { words: 8, extra: 8 });
  assert.deepEqual(allowances(Array.from({ length: 12 }, (_, i) => `H${i}:recall`), 10), { words: 0, extra: 10 });
});

test('a word in its verse: English first, a one-line breakdown, the full parse folded away', () => {
  pointedMode = true;
  const t = book.verses.get('2.3').t[0];
  const h = R.formHTML(t);
  assert.ok(h.indexOf('class="en"') < h.indexOf('class="brief"') && h.indexOf('class="brief"') < h.indexOf('Full parse'));
  assert.ok(h.includes('and she went / walked'));
  assert.ok(h.includes('Qal wayyiqtol 3fs'));
});
test('shortParse keeps only what a reader needs', () => {
  assert.equal(shortParse('Qal perfect (qatal), 3fs'), 'Qal qatal 3fs');
  assert.equal(shortParse('noun, fp, construct'), 'fp construct');
  assert.equal(shortParse('pronominal suffix, 3ms'), '3ms');
  assert.equal(shortParse('Qal participle active, mp absolute'), 'Qal participle mp');
});
test('אֶל lists אַל as a look-alike and carries the note about אֵל', () => {
  const h = R.lookalikeHTML(book.lexemes.get('H413'));
  assert.ok(h.includes('אַל') && h.includes('אֵל'));
  assert.equal(R.lookalikeHTML(book.lexemes.get('H1323')), '');
});

test('a blanked word hides its Hebrew and keeps the rest of the verse', () => {
  const v = ruth.verses.find(x => x.ref === '2.3');
  const t = v.t.find(x => x.lex === 'H1980');
  const html = R.verseHTML(v, { blank: t.id });
  assert.ok(html.includes('class="w blank"'));
  assert.ok(!html.includes(t.p));
  assert.ok(html.includes(v.t.find(x => x.id !== t.id && !x.kq).p));
});
test('write cards count against the extra allowance', () => {
  assert.equal(allowances(['a:write', 'b:which', 'c:recall'], 10).extra, 8);
});
