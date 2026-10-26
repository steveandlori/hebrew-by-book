// Breaks and backlogs (docs/plans/breaks-plan.md, amended by docs/review/plan-breaks.md): the study day, due by
// the day, catch-up, most-at-risk ordering, fading. Dates are local, built with new Date(y, m, d, h).
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { todayKey, dayStartAt, dayEnd, DAY_ROLLOVER_HOUR } from '../js/store.js';
import { backlog, composeSession, fadingWords, BACKLOG_ORDER_MIN, BACKLOG_BLOCK, CATCH_UP_MIN, FADING_R } from '../js/guide.js';
import { State } from '../js/scheduler.js';

const at = (d, h, m = 0) => new Date(2026, 10, d, h, m);   // November 2026, local time

test('the study day runs from 4 am to 4 am', () => {
  assert.equal(DAY_ROLLOVER_HOUR, 4);
  assert.equal(todayKey(at(2, 3, 59)), '2026-11-01');   // late night belongs to the day before
  assert.equal(todayKey(at(2, 4, 0)), '2026-11-02');
  assert.equal(todayKey(at(1, 0, 30)), '2026-10-31');   // across a month end
  assert.equal(+dayStartAt(at(2, 12)), +at(2, 4));
  assert.equal(+dayStartAt(at(2, 2)), +at(1, 4));
  assert.equal(+dayEnd(at(2, 12)), +at(3, 4));
  assert.equal(+dayEnd(at(2, 2)), +at(2, 4));
  assert.equal(+dayEnd(at(30, 12)), +new Date(2026, 11, 1, 4));
});

test('the clock can be faked for the whole module (node:test mock timers)', () => {
  mock.timers.enable({ apis: ['Date'], now: at(9, 23) });
  try {
    assert.equal(todayKey(), '2026-11-09');
    mock.timers.tick(6 * 3600000);   // 5 am the next morning
    assert.equal(todayKey(), '2026-11-10');
  } finally { mock.timers.reset(); }
});

const card = (id, kind = 'recall') => ({ id: `${id}:${kind}`, kind, item: { id } });
const fs = (state, due, stability = 3) => ({ state, due, stability, reps: 4 });

test('backlog: reviews overdue from earlier days, and due today; new and first-session cards are not reviews', () => {
  const deck = ['a', 'b', 'c', 'd', 'e'].map(id => card(id));
  const cards = {
    'a:recall': fs(State.Review, at(5, 12)),       // overdue: due on an earlier day
    'b:recall': fs(State.Relearning, at(9, 3)),    // overdue: 3 am today is still yesterday
    'c:recall': fs(State.Review, at(9, 20)),       // due today, not overdue
    'd:recall': fs(State.Learning, at(1, 12)),     // first-session steps: not counted
  };
  const r = backlog({ deck, getCard: id => cards[id] || null, dayStart: dayStartAt(at(9, 12)), dayEnd: dayEnd(at(9, 12)) });
  assert.deepEqual(r, { overdue: 2, due: 3 });
  assert.equal(CATCH_UP_MIN, 15);
});

test('a large pile of due reviews comes most at risk first, in shuffled blocks; a small one is just shuffled', () => {
  const n = BACKLOG_ORDER_MIN + 20;
  const deck = Array.from({ length: n }, (_, i) => card(`w${i}`));
  const cards = Object.fromEntries(deck.map(c => [c.id, fs(State.Review, at(1, 12))]));
  const risk = id => Number(id.slice(1, id.indexOf(':'))) / n;   // w0 is the most at risk
  const args = { deck, getCard: id => cards[id] || null, isDue: () => true, newWords: 0, extra: 0, riskOf: risk };
  const a = composeSession({ ...args, rng: () => 0.3 }), b = composeSession({ ...args, rng: () => 0.7 });
  assert.equal(a.ordered, true);
  const firstBlock = q => q.slice(0, BACKLOG_BLOCK).map(c => c.id).sort();
  const lowest = deck.slice(0, BACKLOG_BLOCK).map(c => c.id).sort();
  assert.deepEqual(firstBlock(a.queue), lowest);
  assert.deepEqual(firstBlock(b.queue), lowest);
  assert.notDeepEqual(a.queue.slice(0, BACKLOG_BLOCK).map(c => c.id), b.queue.slice(0, BACKLOG_BLOCK).map(c => c.id));
  const small = composeSession({ ...args, deck: deck.slice(0, BACKLOG_ORDER_MIN) });
  assert.equal(small.ordered, false);
  assert.equal(composeSession({ ...args, riskOf: null }).ordered, false);
});

test('a catch-up day puts due Which word? cards with the reviews, before the new words', () => {
  const deck = [card('a'), card('a', 'ctx'), card('a', 'which'), card('n'), card('n', 'ctx')];
  const cards = { 'a:recall': fs(State.Review, at(1, 12)), 'a:ctx': fs(State.Review, at(1, 12)), 'a:which': fs(State.Review, at(1, 12)) };
  const args = { deck, getCard: id => cards[id] || null, isDue: id => !!cards[id], newWords: 1, extra: 0, rng: () => 0.5 };
  const normal = composeSession(args), catchUp = composeSession({ ...args, reviewsFirst: true });
  assert.equal(normal.phaseOf.get('a:which'), 'tell');
  assert.equal(catchUp.phaseOf.get('a:which'), 'recall');
  const ids = catchUp.queue.map(c => c.id);
  assert.ok(ids.indexOf('a:which') < ids.indexOf('n:recall'));
});

test('fading: a word past its first session whose predicted recall is under 0.80; a prediction, not a stage', () => {
  const deck = ['a', 'b', 'c', 'd'].map(id => card(id));
  const cards = {
    'a:recall': fs(State.Review, at(1, 12), 2.3),
    'b:recall': fs(State.Review, at(1, 12), 30),
    'c:recall': fs(State.Learning, at(1, 12), 2.3),   // still in its first session: shaky by design, not "faded"
  };
  const r = { 'a:recall': 0.78, 'b:recall': 0.95, 'c:recall': 0.5 };
  const byCard = new Map(Object.entries(cards).map(([id, c]) => [c, r[id]]));
  const got = fadingWords(deck, id => cards[id] || null, c => byCard.get(c));
  assert.deepEqual([...got], ['a']);
  assert.equal(FADING_R, 0.8);
});
