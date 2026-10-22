import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importState, exportState, DEFAULT_SETTINGS } from '../js/store.js';

test('defaults: 10 new words a day, pointed text, pad shown, intro not yet seen', () => {
  assert.equal(DEFAULT_SETTINGS.newPerDay, 10);
  assert.equal(DEFAULT_SETTINGS.pointing, 'pointed');
  assert.equal(DEFAULT_SETTINGS.showPad, true);
  assert.equal(DEFAULT_SETTINGS.introSeen, false);
  assert.equal(DEFAULT_SETTINGS.gradeButtons, 3);
});
test('import fills missing fields with defaults', () => {
  const s = importState(JSON.stringify({ app: 'hebrew-by-book', settings: { newPerDay: 5 } }));
  assert.equal(s.settings.newPerDay, 5);
  assert.equal(s.settings.pointing, 'pointed');
  assert.deepEqual(s.snapshots, {});
});
test('import rejects bad setting values', () => {
  const s = importState(JSON.stringify({ app: 'hebrew-by-book', settings: { pointing: 'cantillated', gradeButtons: 7, hebSize: 'xl', newPerDay: 0 } }));
  assert.equal(s.settings.pointing, 'pointed');
  assert.equal(s.settings.gradeButtons, 3);
  assert.equal(s.settings.hebSize, 'm');
  assert.equal(s.settings.newPerDay, 10);
});
test('import refuses a file from another app', () => {
  assert.throws(() => importState(JSON.stringify({ app: 'josie-stats' })), /not a Hebrew by Book/);
});
test('export round-trips cards and snapshots', () => {
  const s = importState(JSON.stringify({ app: 'hebrew-by-book', cards: { 'H559:recall': { state: 2 } }, snapshots: { '2026-10-22': { avgInterval: 3 } } }));
  const back = JSON.parse(exportState(s));
  assert.deepEqual(back.cards, s.cards);
  assert.deepEqual(back.snapshots, s.snapshots);
});
