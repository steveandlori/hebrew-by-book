// Scheduling: FSRS (ts-fsrs, default parameters) with one addition: a new card graduates only after
// three correct recalls in its first session (learning steps 1m, 10m, 10m), "successive relearning".
// There is no exam date here; intervals may grow to a year, since the goal is long-term retention.

import { fsrs, createEmptyCard, Rating, State, generatorParameters } from '../vendor/ts-fsrs.mjs';

export { Rating, State };

export const MAX_INTERVAL_DAYS = 365;

export function makeScheduler(settings) {
  const params = generatorParameters({
    request_retention: settings.retention || 0.9,
    maximum_interval: MAX_INTERVAL_DAYS,
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m', '10m', '10m'],
    relearning_steps: ['10m'],
  });
  return fsrs(params);
}

// Stored cards keep dates as ISO strings; ts-fsrs wants Date objects.
export function hydrate(stored) {
  if (!stored) return null;
  return {
    ...stored,
    due: new Date(stored.due),
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  };
}

export function dehydrate(card) {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
}

export function emptyCard(now = new Date()) {
  return createEmptyCard(now);
}

// Returns {card, log} for the chosen rating.
export function grade(scheduler, card, rating, now = new Date()) {
  const r = scheduler.next(card, now, rating);
  return { card: r.card, log: r.log };
}

export function retrievability(scheduler, card, now = new Date()) {
  if (!card || card.state === State.New) return null;
  return scheduler.get_retrievability(card, now, false);
}
