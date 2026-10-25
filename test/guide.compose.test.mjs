import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSession, writePractice } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const w = (id, kinds = ['recall', 'ctx', 'form']) => kinds.map(k => ({ id: `${id}:${k}`, kind: k, item: { id } }));
const wh = id => ({ id: `${id}:which`, kind: 'which', item: { id } });
const rev = (st = 9) => ({ state: State.Review, stability: st, due: new Date(0) });
const rng = () => 0.5; // deterministic shuffle
const phases = (r, p) => r.queue.filter(c => r.phaseOf.get(c.id) === p).map(c => c.id);
const none = () => null, never = () => false;

test('newWords counts words, each met as a recall + in-verse pair', () => {
  const deck = [...w('a'), ...w('b'), ...w('c')];
  const r = composeSession({ deck, getCard: none, isDue: never, newWords: 2, extra: 0, rng });
  assert.deepEqual(new Set(phases(r, 'meet')), new Set(['a:recall', 'a:ctx', 'b:recall', 'b:ctx']));
  assert.equal(r.queue.length, 4);
});
test('ten new words a day means twenty meet cards', () => {
  const deck = Array.from({ length: 15 }, (_, i) => w(`w${i}`)).flat();
  const r = composeSession({ deck, getCard: none, isDue: never, newWords: 10, rng });
  assert.equal(r.counts.meet, 20);
});
test('words are met in deck order', () => {
  const deck = [...w('a'), ...w('b'), ...w('c')];
  const r = composeSession({ deck, getCard: none, isDue: never, newWords: 1, rng });
  assert.deepEqual(new Set(phases(r, 'meet')), new Set(['a:recall', 'a:ctx']));
});
test('due non-which cards are recall; due which cards are tell apart', () => {
  const deck = [...w('a'), wh('a')];
  const cards = { 'a:recall': rev(), 'a:ctx': rev(), 'a:form': rev(), 'a:which': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:recall' || id === 'a:which', newWords: 0, rng });
  assert.deepEqual(phases(r, 'recall'), ['a:recall']);
  assert.deepEqual(phases(r, 'tell'), ['a:which']);
});
test('graduated words get form and Which word? cards from the extra budget, alongside new meets', () => {
  const deck = [...w('a'), wh('a'), ...w('b')];
  const cards = { 'a:recall': rev(), 'a:ctx': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 1, extra: 2, rng });
  assert.deepEqual(phases(r, 'tell'), ['a:which']);
  assert.deepEqual(phases(r, 'deepen'), ['a:form']);
  assert.deepEqual(new Set(phases(r, 'meet')), new Set(['b:recall', 'b:ctx']));
});
test('the extra budget caps deepen + tell apart and interleaves them', () => {
  const deck = [...w('a'), wh('a'), ...w('b'), wh('b')];
  const cards = { 'a:recall': rev(), 'a:ctx': rev(), 'b:recall': rev(), 'b:ctx': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 0, extra: 2, rng });
  assert.equal(r.counts.deepen, 1);
  assert.equal(r.counts.tell, 1);
});
test('form cards of a word still learning are not introduced', () => {
  const deck = [...w('a')];
  const cards = { 'a:recall': { state: State.Learning, stability: 1, due: new Date(0) }, 'a:ctx': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 5, rng });
  assert.deepEqual(phases(r, 'deepen'), []);
});
test('recall block comes first, then meet, then deepen/tell', () => {
  const deck = [...w('a'), wh('a'), ...w('b')];
  const cards = { 'a:recall': rev(), 'a:ctx': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:ctx', newWords: 1, extra: 2, rng });
  const order = r.queue.map(c => r.phaseOf.get(c.id));
  const first = p => order.indexOf(p), last = p => order.lastIndexOf(p);
  assert.ok(last('recall') < first('meet'));
  assert.ok(last('meet') < Math.min(first('deepen'), first('tell')));
  assert.deepEqual(r.counts, { recall: 1, meet: 2, deepen: 1, tell: 1 });
});
test('an in-verse card left behind is finished as meet without using a new word', () => {
  const deck = [...w('a'), ...w('b')];
  const cards = { 'a:recall': { state: State.Learning, stability: 1, due: new Date(0) } };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 1, rng });
  assert.deepEqual(new Set(phases(r, 'meet')), new Set(['a:ctx', 'b:recall', 'b:ctx']));
  assert.deepEqual(phases(r, 'recall'), ['a:recall']);
});
test('an in-verse card already seen is not re-added by the meet pair', () => {
  const deck = [...w('a')];
  const cards = { 'a:ctx': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:ctx', newWords: 4, rng });
  assert.deepEqual(phases(r, 'meet'), ['a:recall']);
  assert.deepEqual(phases(r, 'recall'), ['a:ctx']);
  assert.equal(new Set(r.queue.map(c => c.id)).size, r.queue.length);
});
test('cards in learning steps that are not yet due still belong to the session, after the due ones', () => {
  const deck = [...w('a'), ...w('b')];
  const learning = due => ({ state: State.Learning, stability: 1, due });
  const cards = { 'a:recall': learning(new Date(Date.now() + 5 * 60000)), 'b:recall': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'b:recall', newWords: 0, rng });
  assert.deepEqual(phases(r, 'recall'), ['b:recall', 'a:recall']);
  assert.equal(r.counts.recall, 2);
});
test('zero allowances still serve due cards', () => {
  const deck = [...w('a'), ...w('b')];
  const cards = { 'a:recall': rev(), 'a:ctx': rev() };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: id => id === 'a:recall', newWords: 0, extra: 0, rng });
  assert.deepEqual(r.queue.map(c => c.id), ['a:recall']);
});

test('write-the-Hebrew cards wait until the word has been read in place WRITE_READY_VIEWS times', async () => {
  const { WRITE_READY_VIEWS } = await import('../js/guide.js');
  const deck = [...w('a', ['recall', 'ctx', 'form', 'write']), ...w('b', ['recall', 'ctx', 'write']), ...w('c', ['recall', 'ctx', 'form', 'write'])];
  const seen = n => ({ state: State.Learning, stability: 0.5, reps: n, due: new Date(8.64e15) });
  const cards = { 'a:recall': seen(1), 'a:ctx': seen(WRITE_READY_VIEWS),          // two views in its verse: ready
    'b:recall': seen(1), 'b:ctx': seen(WRITE_READY_VIEWS - 1),                   // one view: not yet
    'c:recall': seen(1), 'c:ctx': seen(1), 'c:form': seen(1) };                  // other forms count too
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 0, extra: 5, rng });
  assert.deepEqual(new Set(phases(r, 'deepen').filter(id => id.endsWith(':write'))), new Set(['a:write', 'c:write']));
});
test('write cards share the extra budget with form and Which word? cards', () => {
  const deck = [...w('a', ['recall', 'ctx', 'form', 'write']), wh('a')];
  const cards = { 'a:recall': rev(), 'a:ctx': { ...rev(), reps: 2 } };
  const r = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 0, extra: 3, rng });
  assert.equal(r.counts.deepen + r.counts.tell, 3);
  const two = composeSession({ deck, getCard: id => cards[id] || null, isDue: never, newWords: 0, extra: 2, rng });
  assert.equal(two.counts.deepen + two.counts.tell, 2);
});

test('writeAfter sets the unlock threshold, and 0 drops write cards entirely', () => {
  const deck = [...w('a', ['recall', 'ctx', 'write'])];
  const one = { 'a:recall': rev(), 'a:ctx': { ...rev(), reps: 1 } };
  const get = cards => id => cards[id] || null;
  assert.deepEqual(phases(composeSession({ deck, getCard: get(one), isDue: never, newWords: 0, extra: 5, writeAfter: 1, rng }), 'deepen'), ['a:write']);
  assert.deepEqual(phases(composeSession({ deck, getCard: get(one), isDue: never, newWords: 0, extra: 5, writeAfter: 2, rng }), 'deepen'), []);
  const started = { ...one, 'a:write': rev() };
  const off = composeSession({ deck, getCard: get(started), isDue: () => true, newWords: 0, extra: 5, writeAfter: 0, rng });
  assert.ok(!off.queue.some(c => c.kind === 'write'));
});

test('Write 10: write cards of met words only; started ones soonest due first, then fresh ones, ready before not', () => {
  const kinds = ['recall', 'ctx', 'write'];
  const deck = ['a', 'b', 'c', 'd', 'e'].flatMap(id => w(id, kinds));
  const at = t => ({ ...rev(), due: new Date(t) });
  const cards = {
    'a:recall': rev(), 'a:ctx': { ...rev(), reps: 3 }, 'a:write': at(2000),
    'b:recall': rev(), 'b:ctx': { ...rev(), reps: 3 }, 'b:write': at(1000),
    'c:recall': rev(), 'c:ctx': { ...rev(), reps: 2 },                       // ready to write, not started
    'd:recall': rev(), 'd:ctx': { ...rev(), reps: 0 },                       // met, not yet read in place twice
  };                                                                         // e: not met
  const getCard = id => cards[id] || null;
  assert.deepEqual(writePractice({ deck, getCard, n: 10, writeAfter: 2 }).map(c => c.id), ['b:write', 'a:write', 'c:write', 'd:write']);
  assert.deepEqual(writePractice({ deck, getCard, n: 3, writeAfter: 2 }).map(c => c.id), ['b:write', 'a:write', 'c:write']);
  assert.deepEqual(writePractice({ deck, getCard, n: 10, writeAfter: 0 }), []);   // Write the Hebrew is Off
});
