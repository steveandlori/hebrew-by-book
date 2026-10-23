import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetStep, meetStars, CLEAN_RECALLS, hintLadder, autoRating, nudgeFor, NUDGES, buildSnapshot, pruneSnapshots, revealLine } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const item = { id: 'H559', he: 'אָמַר', gloss: 'to say', pos: 'V', tr: 'ʾāmar' };
const card = (kind, extra = {}) => ({ id: `H559:${kind}`, kind, item, ...extra });

test('recall ladder is part of speech, a verse, then the first letter', () => {
  const l = hintLadder(card('recall', { hintToken: 't1' }));
  assert.deepEqual(l.map(h => h.type), ['pos', 'verse', 'initial']);
  assert.equal(l[1].token, 't1');
  assert.equal(l[2].text, 'to s…');
});
test('recall ladder without a hint verse skips it', () => {
  assert.deepEqual(hintLadder(card('recall')).map(h => h.type), ['pos', 'initial']);
});
test('in-verse and form ladders are dictionary form then parse', () => {
  for (const k of ['ctx', 'form']) {
    const l = hintLadder(card(k, { token: 't9' }));
    assert.deepEqual(l.map(h => h.type), ['lemma', 'parse']);
    assert.equal(l[1].token, 't9');
  }
});
test('the initial hint handles glosses without "to"', () => {
  const l = hintLadder({ id: 'x:recall', kind: 'recall', item: { ...item, gloss: '[Obj.]' } });
  assert.equal(l.at(-1).text, 'O…');
});
test('Which word? cards have no ladder', () => { assert.deepEqual(hintLadder(card('which')), []); });
test('automatic rating: none, Hard, Again', () => {
  assert.equal(autoRating(0), null); assert.equal(autoRating(1), 2); assert.equal(autoRating(2), 1); assert.equal(autoRating(3), 1);
});
test('reveal line matches hint depth', () => {
  assert.equal(revealLine(0), null);
  assert.match(revealLine(1), /nudge/);
  assert.match(revealLine(2), /Not yet/);
});
test('nudges rotate through three modalities', () => {
  assert.equal(NUDGES.length, 3);
  assert.equal(nudgeFor(3), NUDGES[0]);
  for (const n of NUDGES) { assert.ok(n.text.length > 5); assert.ok(n.reason.length > 5); }
});
test('snapshot averages scheduled days of review cards only', () => {
  const cards = [{ state: State.Review, scheduled_days: 4 }, { state: State.Review, scheduled_days: 10 }, { state: State.Learning, scheduled_days: 0 }];
  assert.deepEqual(buildSnapshot({ new: 1, learning: 1, graduated: 1, solid: 0 }, cards), { stages: { new: 1, learning: 1, graduated: 1, solid: 0 }, avgInterval: 7 });
  assert.equal(buildSnapshot({ new: 2, learning: 0, graduated: 0, solid: 0 }, []).avgInterval, null);
});
test('pruneSnapshots drops entries older than keepDays', () => {
  const snaps = { '2026-08-01': {}, '2026-10-19': {}, '2026-10-20': {} };
  assert.deepEqual(Object.keys(pruneSnapshots(snaps, '2026-10-20', 60)), ['2026-10-19', '2026-10-20']);
});

test('write ladder: part of speech + sound, then the first letter or the dictionary form', () => {
  assert.deepEqual(hintLadder(card('write', { token: 't1' })).map(h => h.type), ['pos', 'firstLetter']);
  assert.deepEqual(hintLadder(card('write', { token: 't1' }), { writeTarget: 'verse' }).map(h => h.type), ['pos', 'lemma']);
});

test('Meet progress: Got it steps, Partly holds, Not yet resets, leaving learning completes', () => {
  assert.equal(meetStep(0, 3, false), 1);
  assert.equal(meetStep(1, 2, false), 1);
  assert.equal(meetStep(2, 1, false), 0);
  assert.equal(meetStep(2, 3, false), 2);          // never complete while still in learning steps
  assert.equal(meetStep(0, 4, true), CLEAN_RECALLS);
});
test('Meet stars rise evenly with clean recalls, not with finished cards', () => {
  // 10 cards, 30 clean recalls: one star per 6 recalls.
  const seq = [];
  const steps = new Map();
  for (let round = 0; round < 3; round++) for (let c = 0; c < 10; c++) {
    steps.set(c, round + 1);
    seq.push(meetStars(steps.values(), 10));
  }
  assert.deepEqual([5, 11, 17, 23, 29].map(i => seq[i]), [1, 2, 3, 4, 5]);
  assert.equal(seq[4], 0);
  assert.equal(meetStars([], 0), 0);
});
