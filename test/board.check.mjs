// Validates the data block of board.html (the progress board). Run: node test/board.check.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../board.html', import.meta.url), 'utf8');
const m = html.match(/\/\* ==== DATA START ==== \*\/([\s\S]*?)\/\* ==== DATA END ==== \*\//);
assert.ok(m, 'data markers missing');
const ctx = {};
vm.runInNewContext(`${m[1]}; this.BOARD = BOARD;`, ctx);
const B = ctx.BOARD;

const str = (v, where) => assert.ok(typeof v === 'string' && v.trim(), `${where} must be a non-empty string`);
str(B.meta.asOf, 'meta.asOf'); str(B.meta.headline, 'meta.headline');
assert.ok(Array.isArray(B.meta.stats) && B.meta.stats.length, 'meta.stats');
B.meta.stats.forEach((s, i) => { str(s.label, `stats[${i}].label`); str(s.value, `stats[${i}].value`); });

const RS = ['active', 'next', 'later', 'done'];
assert.equal(B.roadmap.filter(r => r.status === 'active').length, 1, 'exactly one active milestone');
const ids = new Set();
B.roadmap.forEach(r => {
  str(r.id, 'roadmap.id'); assert.ok(!ids.has(r.id), `duplicate id ${r.id}`); ids.add(r.id);
  str(r.title, `${r.id}.title`); str(r.summary, `${r.id}.summary`); assert.ok(RS.includes(r.status), `${r.id}.status`);
  r.tasks.forEach((t, i) => { str(t.t, `${r.id}.tasks[${i}].t`); assert.ok(['done', 'doing', 'todo'].includes(t.s), `${r.id}.tasks[${i}].s`); });
});
B.actions.forEach(a => {
  str(a.id, 'action.id'); assert.ok(!ids.has(a.id), `duplicate id ${a.id}`); ids.add(a.id);
  str(a.title, `${a.id}.title`); str(a.unblocks, `${a.id}.unblocks`); str(a.advice, `${a.id}.advice`);
  assert.ok(['now', 'soon', 'later'].includes(a.urgency), `${a.id}.urgency`); assert.equal(typeof a.done, 'boolean', `${a.id}.done`);
});
B.tryThis.forEach(t => {
  str(t.id, 'try.id'); assert.ok(!ids.has(t.id), `duplicate id ${t.id}`); ids.add(t.id);
  str(t.title, `${t.id}.title`); str(t.steps, `${t.id}.steps`); assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/, `${t.id}.date`);
});
B.docs.forEach((d, i) => { str(d.title, `docs[${i}].title`); str(d.href, `docs[${i}].href`); str(d.blurb, `docs[${i}].blurb`); });
console.log(`board ok: ${B.roadmap.length} milestones, ${B.actions.length} actions, ${B.tryThis.length} try-this, ${B.docs.length} docs`);
