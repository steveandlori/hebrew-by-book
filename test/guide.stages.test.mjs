import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemStage, stagesByItem, countStages, stageDiff, introDayOf, laterRecalls } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const cards = (id, withWhich = true) => [
  { id: `${id}:recall`, kind: 'recall', item: { id } },
  { id: `${id}:ctx`, kind: 'ctx', item: { id } },
  { id: `${id}:form:x`, kind: 'form', item: { id } },
  ...(withWhich ? [{ id: `${id}:which`, kind: 'which', item: { id } }] : []),
];
const fsrs = (state, stability = 1) => ({ state, stability, due: new Date() });
const store = obj => id => obj[id] || null;

test('a word whose recall card was never seen is new', () => {
  assert.equal(itemStage(cards('h'), store({})), 'new');
});
test('recall card in learning steps means learning', () => {
  assert.equal(itemStage(cards('h'), store({ 'h:recall': fsrs(State.Learning) })), 'learning');
});
test('recall card relearning means learning', () => {
  assert.equal(itemStage(cards('h'), store({ 'h:recall': fsrs(State.Relearning, 9) })), 'learning');
});
test('recall in review but in-verse card unseen is graduated', () => {
  assert.equal(itemStage(cards('h'), store({ 'h:recall': fsrs(State.Review, 9) })), 'graduated');
});
test('recall, in-verse and Which word? in review with stability >= 7 is solid', () => {
  const s = store({ 'h:recall': fsrs(State.Review, 7), 'h:ctx': fsrs(State.Review, 2), 'h:which': fsrs(State.Review, 1) });
  assert.equal(itemStage(cards('h'), s), 'solid');
});
test('stability below 7 keeps a word graduated', () => {
  const s = store({ 'h:recall': fsrs(State.Review, 6.9), 'h:ctx': fsrs(State.Review, 2), 'h:which': fsrs(State.Review, 1) });
  assert.equal(itemStage(cards('h'), s), 'graduated');
});
test('a word without a Which word? card can be solid', () => {
  const s = store({ 'r:recall': fsrs(State.Review, 10), 'r:ctx': fsrs(State.Review, 2) });
  assert.equal(itemStage(cards('r', false), s), 'solid');
});
test('Which word? card still unseen blocks solid', () => {
  const s = store({ 'h:recall': fsrs(State.Review, 10), 'h:ctx': fsrs(State.Review, 2) });
  assert.equal(itemStage(cards('h'), s), 'graduated');
});
test('stagesByItem and countStages aggregate the deck', () => {
  const deck = [...cards('h'), ...cards('r', false)];
  const map = stagesByItem(deck, store({ 'h:recall': fsrs(State.Learning) }));
  assert.equal(map.get('h'), 'learning');
  assert.equal(map.get('r'), 'new');
  assert.deepEqual(countStages(map), { new: 1, learning: 1, graduated: 0, solid: 0 });
});
test('stageDiff lists words that advanced', () => {
  const before = new Map([['a', 'new'], ['b', 'learning'], ['c', 'graduated'], ['d', 'solid']]);
  const after = new Map([['a', 'learning'], ['b', 'graduated'], ['c', 'solid'], ['d', 'solid']]);
  assert.deepEqual(stageDiff(before, after), { met: ['a'], graduated: ['b'], solid: ['c'] });
});
test('a word met and graduated in one session counts in both', () => {
  const before = new Map([['e', 'new'], ['f', 'new']]);
  const after = new Map([['e', 'graduated'], ['f', 'solid']]);
  assert.deepEqual(stageDiff(before, after), { met: ['e', 'f'], graduated: ['e', 'f'], solid: ['f'] });
});

test('Graduated needs a recall on a later day: until then a word out of its learning steps is still learning', () => {
  const s = store({ 'h:recall': fsrs(State.Review, 2.3) });
  assert.equal(itemStage(cards('h'), s, false), 'learning');
  assert.equal(itemStage(cards('h'), s, true), 'graduated');
  const solid = store({ 'h:recall': fsrs(State.Review, 11), 'h:ctx': fsrs(State.Review, 2), 'h:which': fsrs(State.Review, 1) });
  assert.equal(itemStage(cards('h'), solid, false), 'learning');   // never solid without a later-day recall
  const deck = [...cards('h'), ...cards('r', false)];
  const both = store({ 'h:recall': fsrs(State.Review, 3), 'r:recall': fsrs(State.Review, 3) });
  const map = stagesByItem(deck, both, id => id === 'r');
  assert.equal(map.get('h'), 'learning');
  assert.equal(map.get('r'), 'graduated');
  assert.equal(stagesByItem(deck, both).get('h'), 'graduated');   // left out: the old reading, for the composer
});

test('laterRecalls: Got it or Easy on the recall card on a day after the word was met', () => {
  const introduced = { '2026-10-22': ['a:recall', 'a:ctx', 'b:recall'], '2026-10-23': ['c:recall'] };
  const log = [
    { id: 'a:recall', rating: 3, at: '2026-10-22' },   // the day it was met: not yet
    { id: 'b:recall', rating: 2, at: '2026-10-24' },   // Partly: not yet
    { id: 'a:ctx', rating: 3, at: '2026-10-24' },      // not the recall card
    { id: 'a:recall', rating: 3, at: '2026-10-24' },
    { id: 'c:recall', rating: 4, at: '2026-10-25' },
    { id: 'a:recall', rating: 3, at: '2026-10-26' },   // the first later day is kept
    { id: 'd:recall', rating: 3, at: '2026-10-20' },   // met before the record: its first log day counts as met
  ];
  assert.deepEqual(laterRecalls(log, introduced, at => at), { a: '2026-10-24', c: '2026-10-25' });
  assert.equal(introDayOf(introduced, 'c:recall'), '2026-10-23');
  assert.equal(introDayOf(introduced, 'z:recall'), null);
});
