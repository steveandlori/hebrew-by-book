// Pure session logic for the guided loop: word stages, session composition, hint ladder, nudges,
// automatic rating, snapshots. No DOM. Unit-tested in test/. Adapted from josie-stats (formulas → words).
import { State } from './scheduler.js';

/* ───────────────────────── word stages ───────────────────────── */

export const STAGES = ['new', 'learning', 'graduated', 'solid'];
export const STAGE_LABEL = { new: 'New', learning: 'Learning', graduated: 'Graduated', solid: 'Solid' };
const SOLID_STABILITY_DAYS = 7;

const inReview = c => !!c && c.state === State.Review;

// A word's stage is read off its cards' FSRS states; nothing extra is stored.
// New: recall card never seen. Learning: recall in learning steps. Graduated: recall in review.
// Solid: recall stable for a week or more, and its in-verse and Which word? cards (if any) in review too.
export function itemStage(icards, getCard) {
  const recallCard = icards.find(c => c.kind === 'recall');
  const recall = recallCard ? getCard(recallCard.id) : null;
  if (!recall) return 'new';
  if (!inReview(recall)) return 'learning';
  const ctx = icards.find(c => c.kind === 'ctx');
  const which = icards.find(c => c.kind === 'which');
  const ctxOk = !ctx || inReview(getCard(ctx.id));
  const whichOk = !which || inReview(getCard(which.id));
  if (ctxOk && whichOk && recall.stability >= SOLID_STABILITY_DAYS) return 'solid';
  return 'graduated';
}

export function stagesByItem(deck, getCard) {
  const by = new Map();
  for (const c of deck) {
    const k = c.item.id;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(c);
  }
  const out = new Map();
  for (const [id, icards] of by) out.set(id, itemStage(icards, getCard));
  return out;
}

export function countStages(map) {
  const n = { new: 0, learning: 0, graduated: 0, solid: 0 };
  for (const s of map.values()) n[s]++;
  return n;
}

// Words that advanced between two stage maps, grouped by the stage they reached.
export function stageDiff(before, after) {
  const rank = Object.fromEntries(STAGES.map((s, i) => [s, i]));
  const out = { met: [], graduated: [], solid: [] };
  for (const [id, s] of after) {
    const b = rank[before.get(id) || 'new'], a = rank[s];
    if (a <= b) continue;
    if (b < rank.learning) out.met.push(id);
    if (b < rank.graduated && a >= rank.graduated) out.graduated.push(id);
    if (b < rank.solid && a >= rank.solid) out.solid.push(id);
  }
  return out;
}

/* ───────────────────────── session composer ───────────────────────── */

export const PHASE_LABEL = { recall: 'Recall', meet: 'Meet', deepen: 'Deepen', tell: 'Tell apart' };
const DEEPEN_KINDS = new Set(['form', 'write']);
// Write-the-Hebrew cards wait until the word has been read in place (its in-verse and other-form cards)
// this many times (Steve, 2026-10-23: "after the word has been read in place a couple of times").
// The default; Settings can change it, and 0 turns Write the Hebrew off.
export const WRITE_READY_VIEWS = 2;

// Times a word has been read in place: reviews of its in-verse and other-form cards.
export function inPlaceViews(icards, getCard) {
  return icards.filter(c => c.kind === 'ctx' || c.kind === 'form').reduce((n, c) => n + ((getCard(c.id) || {}).reps || 0), 0);
}

function shuffleWith(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function interleave(...lists) {
  const out = [];
  for (let i = 0; i < Math.max(...lists.map(l => l.length)); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

// Builds today's guided queue in phases: recall (due), meet (new words as recall + in-verse pairs),
// deepen (other forms of graduated words; writing the Hebrew of words read in place `writeAfter` times) and tell apart (Which word? cards for graduated words).
// `newWords` = new words to meet today; `extra` = new deepen/tell-apart cards allowed today;
// `writeAfter` = in-place views that unlock a word's Write the Hebrew card (0: no write cards at all).
export function composeSession({ deck, getCard, isDue, newWords, extra = newWords, writeAfter = WRITE_READY_VIEWS, rng = Math.random }) {
  if (!writeAfter) deck = deck.filter(c => c.kind !== 'write');
  const stages = stagesByItem(deck, getCard);
  const isNew = id => !getCard(id);
  const settled = iid => stages.get(iid) === 'graduated' || stages.get(iid) === 'solid';

  const recallDue = deck.filter(c => c.kind !== 'which' && !isNew(c.id) && isDue(c.id));
  // Cards still in learning steps come due within minutes; they belong to this session even if not due yet.
  const inSteps = c => { const s = getCard(c.id); return s && (s.state === State.Learning || s.state === State.Relearning); };
  const recallSoon = deck.filter(c => c.kind !== 'which' && !isNew(c.id) && !isDue(c.id) && inSteps(c))
    .sort((a, b) => new Date(getCard(a.id).due) - new Date(getCard(b.id).due));
  const recall = [...recallDue, ...recallSoon];
  const dueTell = deck.filter(c => c.kind === 'which' && !isNew(c.id) && isDue(c.id));
  const tellNew = deck.filter(c => c.kind === 'which' && isNew(c.id) && settled(c.item.id));
  const byItem = new Map();
  for (const c of deck) { if (!byItem.has(c.item.id)) byItem.set(c.item.id, []); byItem.get(c.item.id).push(c); }
  const writeReady = iid => inPlaceViews(byItem.get(iid), getCard) >= writeAfter;
  const deepenNew = deck.filter(c => c.kind === 'form' && isNew(c.id) && settled(c.item.id));
  const writeNew = deck.filter(c => c.kind === 'write' && isNew(c.id) && writeReady(c.item.id));
  // In-verse cards whose recall card was met but which were left behind finish the meet first (no new word used).
  const meetFinish = deck.filter(c => c.kind === 'ctx' && isNew(c.id) && stages.get(c.item.id) !== 'new');
  const meetPairs = [];
  for (const c of deck) {
    if (c.kind !== 'recall' || stages.get(c.item.id) !== 'new') continue;
    const ctx = deck.find(x => x.kind === 'ctx' && x.item.id === c.item.id && isNew(x.id));
    meetPairs.push(ctx ? [c, ctx] : [c]);
  }

  const meet = [...meetFinish];
  for (const pair of meetPairs.slice(0, Math.max(0, newWords))) meet.push(...pair);
  const extraTake = interleave(tellNew, deepenNew, writeNew).slice(0, Math.max(0, extra));
  const tell = [...dueTell, ...extraTake.filter(c => c.kind === 'which')];
  const deepen = extraTake.filter(c => c.kind !== 'which');

  const phaseOf = new Map();
  recall.forEach(c => phaseOf.set(c.id, 'recall'));
  meet.forEach(c => phaseOf.set(c.id, 'meet'));
  deepen.forEach(c => phaseOf.set(c.id, 'deepen'));
  tell.forEach(c => phaseOf.set(c.id, 'tell'));
  const meetRecall = meet.filter(c => c.kind === 'recall');
  const meetCtx = meet.filter(c => c.kind !== 'recall');
  const queue = [
    ...shuffleWith(recallDue, rng), ...recallSoon,
    ...shuffleWith(meetRecall, rng),
    ...shuffleWith(meetCtx, rng),
    ...shuffleWith([...deepen, ...tell], rng),
  ];
  return { queue, phaseOf, counts: { recall: recall.length, meet: meet.length, deepen: deepen.length, tell: tell.length } };
}

// What is left of today's allowances, given the card ids introduced today: new words (counted by their recall
// card) and new deepen/tell-apart cards (form, write, which). In-verse cards finishing a meet use no allowance.
// `moreWords` = new words asked for beyond the daily number (Learn 5 new words); it adds words only.
export function allowances(introducedToday, newPerDay, moreWords = 0) {
  const words = introducedToday.filter(id => id.endsWith(':recall')).length;
  const extra = introducedToday.filter(id => /:(form|which|write)(:|$)/.test(id)).length;
  return { words: Math.max(0, newPerDay + moreWords - words), extra: Math.max(0, newPerDay - extra) };
}

// Write 10 (Steve, 2026-10-24: "a review, but with concentrated writing"): Write the Hebrew cards for words
// already met, and nothing else. Cards already started come first, soonest due; then ones not yet started, for
// words read in place `writeAfter` times before the rest, each in the order the words were met. None when Write
// the Hebrew is Off.
export function writePractice({ deck, getCard, n = 10, writeAfter = WRITE_READY_VIEWS }) {
  if (!writeAfter) return [];
  const stages = stagesByItem(deck, getCard);
  const writes = deck.filter(c => c.kind === 'write' && stages.get(c.item.id) !== 'new');
  const started = writes.filter(c => getCard(c.id)).sort((a, b) => new Date(getCard(a.id).due) - new Date(getCard(b.id).due));
  const fresh = writes.filter(c => !getCard(c.id));
  const ready = c => inPlaceViews(deck.filter(x => x.item.id === c.item.id), getCard) >= writeAfter;
  return [...started, ...fresh.filter(ready), ...fresh.filter(c => !ready(c))].slice(0, n);
}

/* ───────────────────────── Meet stars ───────────────────────── */

// A new card leaves the session after this many clean recalls (the scheduler's three learning steps).
export const CLEAN_RECALLS = 3;

// One Meet card's progress after a grade: Got it or Easy moves it a step, Not yet sends it back to the start
// (as the scheduler does), Partly holds it; a card that has left its learning steps is complete.
export function meetStep(prev, rating, graduated) {
  if (graduated) return CLEAN_RECALLS;
  if (rating <= 1) return 0;
  return rating >= 3 ? Math.min(prev + 1, CLEAN_RECALLS - 1) : prev;
}

// Stars (0-5) for the Meet stretch, counted in clean recalls rather than finished cards: cards finish
// together near the end of Meet, so counting finished cards bunched the stars there (Steve, 2026-10-23).
export function meetStars(steps, totalCards) {
  if (!totalCards) return 0;
  let done = 0;
  for (const s of steps) done += s;
  return Math.min(5, Math.floor(5 * done / (CLEAN_RECALLS * totalCards)));
}

// Today's Meet progress, carried across a same-day rebuild of the session (a page reload). Ported from
// josie-stats (its handoff, 2026-10-23). `saved` is the stored {day, ids, steps, stars}; `phaseOf` is the new
// session's map, changed in place: today's Meet cards that are still queued go back under Meet (the composer
// files graded ones still in learning under Recall). A saved card that was never graded and is no longer
// queued is dropped, or it would hold the stars short of 5. A finished round stays finished: new words met
// after it (Learn 5 new words) start a round of their own, with its own five stars.
export function carryMeet(saved, day, phaseOf) {
  const fresh = [...phaseOf].filter(([, p]) => p === 'meet').map(([id]) => id);
  if (!saved || saved.day !== day) return { day, ids: fresh, steps: {}, stars: 0 };
  const kept = saved.ids.filter(id => id in saved.steps || phaseOf.has(id));
  const finished = kept.length > 0 && kept.every(id => (saved.steps[id] || 0) >= CLEAN_RECALLS);
  if (finished && fresh.some(id => !saved.ids.includes(id))) return { day, ids: fresh, steps: {}, stars: 0 };
  for (const id of saved.ids) if (phaseOf.has(id)) phaseOf.set(id, 'meet');
  const ids = [...new Set([...kept, ...fresh])];
  // Meet grew since (more new words a day): a bigger round, so stars are recounted for it and may go down,
  // rather than showing "Meet complete" while new cards remain.
  const grew = fresh.some(id => !saved.ids.includes(id));
  const stars = grew ? Math.min(saved.stars || 0, meetStars(Object.values(saved.steps), ids.length)) : (saved.stars || 0);
  return { day, ids, steps: { ...saved.steps }, stars };
}

/* ───────────────────────── hint ladder, nudges, grading ───────────────────────── */

// Hints reveal the answer gradually (Finn & Metcalfe 2010). Each entry is data; the app renders it.
//   recall: part of speech (+ transliteration) → the word in one of its verses → first letter of the gloss
//   ctx/form: the dictionary form → the full parse of this form
//   write:    part of speech → the first letter → how the dictionary form sounds (dictionary form asked), or
//             part of speech → how it sounds → the dictionary form (the form in the verse asked). The sound
//             nearly spells the answer, so it comes late.
export function hintLadder(card, { writeTarget = 'lemma' } = {}) {
  const w = card.item;
  switch (card.kind) {
    case 'recall': return [
      { type: 'pos', pos: w.pos, tr: w.tr },
      ...(card.hintToken ? [{ type: 'verse', token: card.hintToken }] : []),
      { type: 'initial', text: initialOf(w.gloss) },
    ];
    case 'ctx':
    case 'form': return [{ type: 'lemma', item: w.id }, { type: 'parse', token: card.token }];
    case 'write': return writeTarget === 'verse'
      ? [{ type: 'pos', pos: w.pos }, { type: 'sound', tr: w.tr }, { type: 'lemma', item: w.id }]
      : [{ type: 'pos', pos: w.pos }, { type: 'firstLetter', item: w.id }, { type: 'sound', tr: w.tr }];
    default: return [];
  }
}

function initialOf(gloss) {
  const g = String(gloss).replace(/^to\s+/i, '').replace(/^[^A-Za-z]+/, '');
  return g ? `${/^to\s/i.test(gloss) ? 'to ' : ''}${g[0]}…` : '…';
}

// A hinted answer grades itself: one hint = Hard (2), two or more = Again (1), none = learner grades.
export function autoRating(hints) { return hints <= 0 ? null : hints === 1 ? 2 : 1; }

export function revealLine(hints) {
  if (hints <= 0) return null;
  if (hints === 1) return 'You got there with a nudge. It will come back soon.';
  return 'Not yet, and that is fine. Seeing the answer right after a real try is how it starts to stick.';
}

export const NUDGES = [
  { text: 'Say the Hebrew out loud, then its meaning.', reason: 'Speaking your answer is as good for memory as thinking it, and saying some cards aloud makes them stand out from the rest (the production effect).' },
  { text: 'Write the meaning down, on paper or in the pad below.', reason: 'A written answer is a commitment. It keeps your self-grading honest, which is what keeps the schedule accurate.' },
  { text: 'Answer it in your head this time.', reason: 'Retrieving silently strengthens memory as much as writing it out. What matters is the attempt.' },
];
export const nudgeFor = i => NUDGES[((i % NUDGES.length) + NUDGES.length) % NUDGES.length];

/* ───────────────────────── snapshots (for the momentum view) ───────────────────────── */

export function buildSnapshot(stages, cards) {
  const rev = cards.filter(c => c && c.state === State.Review);
  const avg = rev.length ? Math.round(rev.reduce((a, c) => a + (c.scheduled_days || 0), 0) / rev.length * 10) / 10 : null;
  return { stages: { ...stages }, avgInterval: avg };
}

export function pruneSnapshots(snapshots, todayKey, keepDays = 60) {
  const cutoff = new Date(todayKey + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() - keepDays);
  const out = {};
  for (const k of Object.keys(snapshots || {})) if (new Date(k + 'T00:00:00') >= cutoff) out[k] = snapshots[k];
  return out;
}
