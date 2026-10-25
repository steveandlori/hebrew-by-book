# Plan: breaks, backlogs and fading (2026-10-25)

From `docs/research/breaks.md` (the research). Steve: "please move ahead with the research for and improvements to
that model", and "review that plan with a Fable model before moving to implementation". He has not chosen the
rollover hour; 4 am is the default below, his to veto.

## Goals

1. Reviews happen on the day they are planned. Today a card due at 3 pm waits until tomorrow's session when he studies
   at noon (the research measured reviews running 1.5× late). In the model, fixing this halves forgotten words at
   about the same daily time.
2. Coming back after missed days is manageable, and the app does not pretend nothing happened:
   - reviews first, new words paused;
   - the words most at risk come first;
   - a natural place to stop when the pile is large.
3. A word that has probably faded while he was away is shown as such, without changing what is stored.
4. Nothing already working regresses: Meet, stars, Meet 5 new, Review 10, Write 10, the wrap-up, stages, and the
   debug links.

## Changes

### 1. A study day with a 4 am rollover; due for the whole day

- `store.todayKey(d)` returns the key of `d − 4 h`, so 1 am belongs to the previous day. Every day key goes through
  it: `newIntroduced`, `sessions`, `meetDay`, `dayStart`, `moreWords`, `laterRecall`, the streak, snapshots and the
  export filename. A new constant, `DAY_ROLLOVER_HOUR = 4`, lives in store.js and is exported.
- `store.dayEnd(d)` returns the Date of the next rollover after `d` (today 4 am if before 4 am, else tomorrow 4 am).
- `isDue(id, at)` changes to `c.due < dayEnd(at)`, and `dueCards` likewise. Every card due at any time today is due
  now.
  - `studyAhead` (Review 10) keeps `!isDue(...)`. Its meaning becomes "not due today", which is right.
  - `composeSession` gets `isDue` from app.js, so nothing changes there. Cards in learning steps that are due in 10
    minutes now count as due. They already join the session through `recallSoon`; check that they are not
    double-listed, and that the requeue in `onGrade` is unchanged.
  - `resumeOrStart` (same day, finished session) adds `dueCards()` not already queued. With day-based due, a review
    card graded earlier today that is due later today could only be a relearning card, and those are requeued in
    session. Check that a finished session does not instantly refill with cards graded minutes ago.
- The "next cards come due…" line keeps using timestamps.
- Existing data: day keys recorded before this used midnight. Only sessions between midnight and 4 am are affected;
  accepted.
- Tests (node:test, mock timers): todayKey at 03:59 and 04:00; dayEnd; isDue for a card due 23:00 today, 03:00
  tomorrow (before the rollover: due) and 05:00 tomorrow (not due).

### 2. Catch-up mode: pause new words when reviews from earlier days are waiting

- A pure helper in guide.js: `backlog({ deck, getCard, dayStart })` returns `{ overdue, due }`, where:
  - `overdue` = cards in Review or Relearning whose due is before the start of today (`dayStart` = the last rollover);
  - `due` = everything due today.
- Rule: **catch-up** when `overdue >= CATCH_UP_MIN` (proposed 15, about a third of a normal day of reviews). This
  stops the leftovers of one interrupted session (the research: about 24 queued cards, only some of them reviews)
  from pausing a day.
  - **Judgement call (Steve's to veto):** the research's tested rule was "any card a day or more overdue"; 15 is
    untested and chosen to ignore stray leftovers. The plan review should challenge this number.
- In catch-up, `startSession` passes `newWords: 0, extra: 0`. Write-card unlocks mid-session (`queueWriteCard`) are
  also skipped (they use `extraAllowance`; catch-up sets a session flag that `queueWriteCard` respects).
- The Today header gets a line: "Catching up: N reviews waiting from earlier days. New words wait until you've
  caught up." The phase strip is unchanged.
- When a catch-up session finishes, the wrap-up says "Caught up", and the third button becomes "Meet N new", N being
  the day's remaining allowance (normally 10). Pressing it meets them in a fresh Meet round, reusing
  `learnMoreWords` with `n = allowance`, not +5.
  - If the wrap-up comes early (soft stop, change 3), the button stays "Meet 5 new" as the manual override.
- Reload behaviour: `startSession` recomputes catch-up. After catching up, `overdue` is 0, so a reload brings the
  day's new words. This is consistent with the button.
- Debug link: `?debug=away&days=7` seeds `words` (default 30) as met over the previous days, then moves the clock of
  the seeded cards back by `days`. It shifts each card's `due`/`last_review` and the log's `at` back, rather than
  faking `Date`, so catch-up can be seen without waiting.
- Tests: pure tests of `backlog` and of `composeSession` with `newWords: 0`; an app-level check in the browser with
  Playwright's `page.clock` (a session, then `fastForward` 7 days, then reload, then catch-up shown with no Meet cards).

### 3. Most-at-risk first, and a soft stop

- `composeSession` takes an optional `riskOf(cardId)`, the card's predicted recall. When given and the due reviews
  number more than `BACKLOG_ORDER_MIN` (60):
  1. sort the due reviews by `riskOf` ascending (most likely forgotten first);
  2. cut them into blocks of 20 and shuffle within each block (so a word's cards are not seen back to back);
  3. otherwise, shuffle as now.
- Soft stop: when a session has more than `SOFT_STOP` (60) recall-phase cards, after the 60th graded review card the
  app shows a one-time interstitial: "60 reviews done. The rest (N) can wait until tomorrow: the ones most at risk
  are behind you." Buttons: "Keep going" and "Stop for today" (goes to the wrap-up; the queue is dropped). Not shown
  in Meet. Shown at most once per day; `state.softStop = { day }`.
  - **Judgement call (Steve's to veto):** lowest-R first. The research found no difference in words kept; it makes
    stopping early safe, but means more misses early in the session.
- Tests: composer ordering with a fake `riskOf` (the first block has the lowest R; within blocks the order varies
  with the rng); the soft stop shows once.

### 4. A "fading" mark

- A pure helper in guide.js: `fadingWords(deck, getCard, riskAt)` returns the set of word ids whose recall card's
  predicted recall (`retrievability` at now) is below `FADING_R = 0.80`, about three times its planned gap. It
  applies only to words in Graduated or Solid (a word in Learning is expected to be shaky).
- Shown:
  - **Words tab:** a small "fading" chip after the stage chip.
  - **Read:** the stage underline turns dotted for fading words (one CSS class, `st-fading`, alongside the stage
    class).
  - **Progress:** a line under "Where your words are": "N words may have faded since you last saw them; they come
    first in your next session." That is true by change 3 only when the backlog is large, so the wording is "they are
    due".
- Never part of `stagesByItem`, `stageDiff`, `dayStart` or snapshots.
- **Judgement call (Steve's to veto):** threshold 0.80.
- Tests: the helper with fake R; stageDiff unaffected.

### 5. An open tab across the rollover

- A `visibilitychange` listener: when the page becomes visible on the Today route and `session.day !== todayKey()`,
  call `resumeOrStart()`. Skip if the pad is expanded.
- Test in the browser with `page.clock`: open Today, fast-forward past 4 am, dispatch `visibilitychange`, and check
  that a new day's session is built.

### Not changing (from the research)

Interrupted learning steps continue where they stopped. Relearning stays one 10-minute step. There is no stability
penalty for absence. The UTC-day quirk inside ts-fsrs stays as it is (a note in STATUS).

## Order of work

1, then 2, then 3, then 4, then 5. Each step gets unit tests, a STATUS decision (27+) and a ledger row. Then a browser
pass with `page.clock`:
- a normal day;
- a missed day;
- a week away;
- a session interrupted at night and resumed after 4 am;
- a tab left open overnight;
- debug links;
- every finished-day button.

Then a code review (Fable), the fixes, the josie-stats note (the day rollover, due-by-day and catch-up apply there
too), and the board.

## Risks to look at in the plan review

- Day-based due changes what "due" means everywhere. Check every caller of `isDue`/`dueCards`, and
  `composeSession`'s `recallSoon` (cards in steps that are not due).
- The 4 am rollover moves day keys. Check `carryMeet`, `dayStart`, `moreWords`, `laterRecall` ("later day" is now
  rollover-based) and the streak.
- Catch-up and Meet 5 new interact: the allowance, the moreWords arithmetic, and stars.
- The soft stop interacts with Meet stars, the wrap-up, `resumeOrStart`, and Review 10 / Write 10 sessions (which
  should not get the soft stop?).
- The fading mark costs a `retrievability` call per word on each render of Read and Words (287 words, cheap; cache per
  render).
