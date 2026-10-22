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
const DEEPEN_KINDS = new Set(['form']);

function shuffleWith(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function interleave(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (i < a.length) out.push(a[i]); if (i < b.length) out.push(b[i]); }
  return out;
}

// Builds today's guided queue in phases: recall (due), meet (new words as recall + in-verse pairs),
// deepen (other forms of graduated words) and tell apart (Which word? cards for graduated words).
// `newWords` = new words to meet today; `extra` = new deepen/tell-apart cards allowed today.
export function composeSession({ deck, getCard, isDue, newWords, extra = newWords, rng = Math.random }) {
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
  const deepenNew = deck.filter(c => DEEPEN_KINDS.has(c.kind) && isNew(c.id) && settled(c.item.id));
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
  const extraTake = interleave(tellNew, deepenNew).slice(0, Math.max(0, extra));
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
// card) and new deepen/tell-apart cards (form, which). In-verse cards finishing a meet use no allowance.
export function allowances(introducedToday, newPerDay) {
  const words = introducedToday.filter(id => id.endsWith(':recall')).length;
  const extra = introducedToday.filter(id => /:(form|which)(:|$)/.test(id)).length;
  return { words: Math.max(0, newPerDay - words), extra: Math.max(0, newPerDay - extra) };
}

/* ───────────────────────── hint ladder, nudges, grading ───────────────────────── */

// Hints reveal the answer gradually (Finn & Metcalfe 2010). Each entry is data; the app renders it.
//   recall: part of speech (+ transliteration) → the word in one of its verses → first letter of the gloss
//   ctx/form: the dictionary form → the full parse of this form
export function hintLadder(card) {
  const w = card.item;
  switch (card.kind) {
    case 'recall': return [
      { type: 'pos', pos: w.pos, tr: w.tr },
      ...(card.hintToken ? [{ type: 'verse', token: card.hintToken }] : []),
      { type: 'initial', text: initialOf(w.gloss) },
    ];
    case 'ctx':
    case 'form': return [{ type: 'lemma', item: w.id }, { type: 'parse', token: card.token }];
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
