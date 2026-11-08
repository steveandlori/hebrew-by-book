# Code review 5: the daily budget (a4428fa..3ab11be)

Reviewer: adversarial code agent (Fable), 2026-11-07. Read-only on source. Probes:
- Throwaway Node scripts importing `guide.js` by file URL (`dayBudget` over every setting × pace 4–40 s × due 0–600
  against exact tenth-of-a-view arithmetic; `paceSeconds` on reversed, malformed and missing timestamps).
- No browser run this time: every finding below is a fixed code path readable without one; the plan's own browser
  check (120 due → Recall 75, 72 after 3 and a reload) covers the quota-across-reload path.

Scope: `git diff a4428fa..3ab11be -- js css test`, against docs/plans/review-cap-plan.md ("As built"),
docs/review/plan-review-cap.md (rule f, R-1..R-14), STATUS.md decisions 27–28, docs/agents/COMMON.md.
Covenant: about 15 minutes a day must stay achievable; a break must not produce a mountain.

Test suite at 3ab11be: `node --test test/*.test.mjs` 93 passed.

## Findings

| id | severity | label | one line |
|----|----------|-------|----------|
| C5-1 | SHOULD-FIX | VERIFIED (by reading, unambiguous path) | "New words per day" no longer applies today: `dailyNumber()` returns the frozen `dayPlan.newQuota`, even with Daily time at No limit; the Settings help does not say so, and the budget note then reads "for 5 new words (of 10)" as if the budget had cut them |
| C5-2 | MINOR | VERIFIED (by reading) | A mid-day re-plan (the upgrade from a v-less plan; any future `v` bump) measures `due` after the morning's reviews but keeps `reviewed`, so the upgrade day can run over budget and the note's numbers are wrong for that day |
| C5-3 | MINOR | VERIFIED (by reading) | The notes read live settings, not the plan's: after a change the budget note says "your 30 minutes" about a 15-minute plan; "A change applies from tomorrow" is false before the day's first Today visit |
| C5-4 | MINOR (design question) | VERIFIED reachable (by reading) | The soft stop still fires at 60 reviews under the default 15-minute budget (quota 75 → `ordered`), interrupting a budgeted day at about minute 10 with "the rest can wait until tomorrow" |
| C5-5 | MINOR | VERIFIED (Node probe for reachability) | Budget-note wording: "Today’s 0 reviews leave room …" (reachable: 10 minutes at a slow pace) and "Today’s 1 review leave room" |
| C5-6 | MINOR | VERIFIED (grep) | Catch-up leftovers: `CATCH_UP_MIN` exported, imported nowhere, kept alive by a test; store.js shape comment and the CSS comment describe the old plan; composeSession's `held` is returned and unused |
| C5-7 | MINOR | VERIFIED (by reading) | With the catch-up gate gone, a Write card can be spliced into position 3 of the review phase on a review day; the phase strip shows Deepen mid-Recall and the budget note disappears for that card |
| C5-8 | MINOR | by reading | Settings help for New words per day still says "The same number caps new practice cards" and "at 10 a day" — the budget now sets practice cards separately and the default is 5 |

### Details

**C5-1 — new words per day is frozen for the day (SHOULD-FIX).** Before this commit `dailyNumber()` read
`state.settings.newPerDay` live, and `carryMeet` (guide.js 344–350, "Meet grew since (more new words a day)") exists
for the case where Steve raises it mid-day and the Meet round grows. Now `dailyNumber()` returns `todayPlan().newQuota`,
which is computed once (app.js 111–128) and only re-computed on a day change or a `v` change. Sequence: day starts,
Steve opens Today (plan: newQuota 5), goes to Settings, sets 10, returns to Today → `startSession` → `newWordAllowance()`
= `allowances(intro, 5, 0, extra)` → still 5 words. The same with Daily time at No limit: `dayBudget` returns
`newWords: newPerDay` *at planning time*, so even "no limit" is frozen. Nothing tells him: the New words per day help
has no "applies from tomorrow" line (only Daily time has one), and `budgetNoteHTML` compares the frozen `newQuota`
against the live setting (`want`), so it then shows "Today’s N reviews leave room in your 15 minutes for 5 new words
(of 10)" on a day the budget did not cut anything. Lowering 5 → 3 mid-day is also ignored (the plan says 5).
*Fix (either):* (a) on `#npd`/`#dm` save, if `state.dayPlan` is today's, re-plan keeping `reviewed`/`stopped`/… —
but see C5-2 for what `due` to use; or (b) keep "applies tomorrow" as the rule for both settings and say so in both
help texts, and have the note read `plan.newPerDay`/`plan.minutes` (store them in the plan, C5-3). (b) is the smaller
change and matches the plan doc; (a) matches the old behaviour Steve has used ("Meet 5 new" remains the live knob
either way).

**C5-2 — the mid-day re-plan prices the day from what is left (MINOR, one-off per `v` bump).** `todayPlan()` re-plans
when `old.v !== 3` and, when `same`, carries `reviewed` over but computes the budget from `backlog(...).dueReviews`
*now*, i.e. the cards still due after the reviews already done. Sequence (Steve's phone today: a v-less plan,
126 due at 4 am, he did 60 reviews under the old build, 20 left due): upgrade → `due` 20, `reviewQuota` 75,
`reviewsLeftToday` = 75 − 60 = 15, `left` views = 90 − 20×1.2 = 66 → `newQuota` 5. The day becomes 60 + 15 reviews
+ 5 new words (≈ 60 more views than the budget). With 96 left due and 30 reviewed, the held branch prints "96 reviews
are waiting … Today takes the 75 most at risk" while 45 more come. *Fix:* when `same`, plan from the day's pool as it
was: `due = b.dueReviews + old.reviewed.length` (cards graded today are no longer due, so adding the distinct
reviewed ids restores the morning count closely enough), or keep `old.due` when the old plan has one.

**C5-3 — notes read live settings (MINOR).** `budgetNoteHTML` uses `state.settings.newPerDay` and
`state.settings.dailyMinutes`; Settings and the renderStudy "Done for today" line ("Today’s ${dailyMinutes} minutes
are used") do the same. Change Daily time 15 → 30 mid-day: the note says "fit in your 30 minutes" about a plan built
for 15; the finished screen says "Today’s 30 minutes are used". And "A change applies from tomorrow" is only true
once today's plan exists: Settings first, then Today, applies today (harmless, but the sentence is wrong).
*Fix:* store `minutes` and `newPerDay` in the plan (next to `pace`, `views`) and print those; word the help "applies
from the next day you start" or re-plan on save (C5-1 a).

**C5-4 — soft stop under the budget (MINOR, a question for Steve).** `checkpointDue` fires when `plan.ordered`
(now true whenever the pool is capped) and `reviewed ≥ 60` and reviews remain. With the default 15 minutes at 10 s the
quota is 75, so any day with more than 75 due shows "60 reviews done. 15 more are waiting. The ones most at risk are
behind you, so the rest can wait until tomorrow." at about minute 10 of a 15-minute day — the budget already bounded
the day, and a Stop there leaves the 15 plus the held ones for "later days". R-8 said this is fine "with no limit";
with a budget the stop is a second, blunter instrument. *Fix if wanted:* fire the soft stop only when
`plan.reviewQuota === null` (no limit), or when `reviewQuota - SOFT_STOP` is large (e.g. a 30-minute day at a fast
pace). Not a bug; the plan's own comment admits the overlap.

**C5-5 — wording (MINOR).** Third branch of `budgetNoteHTML`: `Today’s ${plan.due} review${s(plan.due)} leave room …`.
With `due` 0 the note still shows when `newQuota < want`: probe `dayBudget({due: 0, minutes: 10, secPerView: 40,
newPerDay: 5})` → 1 new word, so "Today’s 0 reviews leave room in your 10 minutes for 1 new word (of 5)". With `due`
1: "Today’s 1 review leave room". *Fix:* `due === 0 ? 'Your 10 minutes have room for …' : …`, and `leave`/`leaves`.

**C5-6 — leftovers (MINOR).** `CATCH_UP_MIN` (guide.js 199) is exported, imported by nothing in `js/`, and kept by
`assert.equal(CATCH_UP_MIN, 15)` in test/breaks.test.mjs; its comment still describes the catch-up day. store.js 72:
`dayPlan: … // {day, catchUp, overdue, caughtUp, softStop, stopped}` is the old shape. css/style.css 591: "breaks: the
catch-up note and the checkpoints" (class `.catchup` now styles the budget note; fine to keep the class, fix the
comment). `composeSession` returns `held`, which app.js never reads (`budgetNoteHTML` recomputes it from the plan;
C5-2 shows the composer's value would be the truer one mid-day). `renderCheckpoint` keeps `kind` with one body (fine).
docs: method.js has no catch-up text (checked); How it works says nothing about the budget either, which is a gap,
not an error.

**C5-7 — Write card among the reviews (MINOR).** `queueWriteCard` used to return on a catch-up day because the write
card "would sit among the reviews". Now `reviewsFirst` is always true and the gate is only `plan.stopped`. A ctx
review graded during the Recall phase with `inPlaceViews ≥ writeAfter` and `extraQuota > 0` splices the Write card at
index 3, phase `deepen`. On a review day with `extraQuota` 1–2 (e.g. due 70 at 15 min → `newWords` 0, `extra` 2) the
strip shows Deepen 1 while Recall is current and the budget note (rendered only when `phase === 'recall'`) vanishes
for that card and returns after. Cosmetic, within budget. *Fix:* splice after the last recall-phase card when
`session.mode === 'today'`, or leave it and accept.

**C5-8 — New words per day help (MINOR).** "The same number caps new practice cards for words you already know" is
now only true at No limit; with a budget `extraQuota` is separate. "N words at 10 a day takes about M days" still
uses 10 while the default moved to 5. *Fix:* "at ${s.newPerDay} a day", and "also the most new practice cards a day".

## Checked and sound

- **First computation of `todayPlan()`.** Callers: `dailyNumber`/`dailyExtra` (only via `startSession`,
  `learnMoreWords`, `queueWriteCard`), `startSession`, `checkpointDue`, `renderCheckpoint`, `onGrade` (today mode,
  Review-state card only), `renderStudy` (empty queue), `renderWrapUp`. Nothing on Read/Words/Names/Progress/Settings/
  How calls it; Settings' pace line uses `paceSeconds(state.log)` only. The Today route goes through `resumeOrStart`
  → `startSession`, so the plan is first built when the session is. `debugSeed` runs `applyGrade` only (no plan
  access) with `clockShift` back at 0 before `persist`; import replaces `state` (plan from the file, normalised
  through `shape`) and Start over nulls it; both `resetSession()` so the next Today visit rebuilds. The post-4 am
  grade on a card drawn before (R-9) lands one review in the new day's `reviewed` after `applyGrade` has moved it out
  of `due`: one fewer today, as accepted.
- **`dayBudget` arithmetic.** Probe over minutes {10,15,20,30} × pace {4..40} × newPerDay {3,5,10,15,20} × due 0..600:
  0 mismatches against exact integer arithmetic (no floating-point floor slips). due 0 gives the full setting when
  the views allow; `max(0, …)` guards the `due > reviews` case; No limit returns `null` views/reviews and the setting
  for both quotas (R-1: `reviewCap === null` is the only "no limit"; 0 means none left, tested).
- **`paceSeconds`.** Gaps 2–120 s only, last 400 entries, median, clamped 4–40, default 10 under 30 gaps. Reversed
  log → negative gaps dropped → default; malformed or missing `at` → NaN fails both comparisons → default. Debug
  seeding writes three grades per card at the same shifted instant (gaps ≈ 0, dropped) and day-sized gaps between
  words (dropped). Review 10 / Write 10 grades count toward the pace (they are his pace too). Meet and Write cards are
  slower than reviews, so the measured pace is conservative for the budget: a 15-minute day errs short, which is the
  covenant's safe side.
- **`composeSession` with `reviewsFirst` always true.** `recallDue` excludes step cards; `recallSoon` now takes every
  non-new card in its steps whatever its kind (Which cards in Learning/Relearning included) and is never capped
  (R-2); `dueWhich` is in the capped pool on every day (R-10) and `dueTell` is empty; `backlog.dueReviews` counts
  exactly the Review-state cards the pool holds (same deck filter: `writeOn` ≡ the composer's write filter), so
  `plan.due` and the pool agree at planning time. `counts.recall` = reviews + steps; phase strip, Meet stars
  (`carryMeet` on `phaseOf`) and `meetFinish` untouched. `ordered` is set when capped, so a capped pile is most at
  risk first as the plan says; the uncapped small pile stays shuffled.
- **Quota accounting.** `wasReview` is read before `applyGrade`, so Again on a Review card counts it once; its
  relearning regrade (state Relearning) does not; a Relearning card carried from yesterday never counts (R-3). After a
  reload `reviewsLeftToday` = quota − distinct reviewed, and the graded cards are no longer due (or are steps, served
  outside the cap), so the pool is capped to exactly what remains (the plan's 75 → 72 check). Meet 5 new (`keepDone`)
  passes the same remaining cap, so it re-serves at most the same most-at-risk set, never more; after a full day
  (cap 0) it serves no reviews (R-1). Review 10 is mode 'ahead' and adds nothing to `reviewed` (R-14); it takes
  due-today most-at-risk first, so it eats into the held pile, and the next `startSession` caps the smaller pool with
  the unchanged `reviewed`. `staleDay()` guards every finished-screen button.
- **Allowances.** `allowances(intro, newQuota, moreWords, extraQuota)`: after a stop both quotas read 0 and Meet 5
  new gives exactly five words and no extras (P-2). `learnMoreWords` uses `dailyNumber()` (the frozen quota), so on a
  review day `met + 5 − 0` = five words, as intended. `queueWriteCard` checks `extraAllowance() − queuedNew`.
- **`reviewsWaiting` / finished screens.** Counts Review-state due cards (steps excluded, since a reload serves them)
  whenever called, which is only with the queue empty or at a wrap-up, so it is the held pile (R-5). "Done for
  today" appears only when something is held; on a no-limit day the queue cannot be empty with reviews due, so "All
  caught up" / "Today’s session is done and nothing is due" is right. Wrap-up text "wait for later days" is correct
  under a cap and after a stop.
- **Settings migration.** `normalizeSettings`: `raw` null (fresh) → defaults with rev 2; a saved `{newPerDay: 10}`
  without rev → 5 once, rev 2 persisted at the next save; `{newPerDay: 10, settingsRev: 2}` kept (tested);
  `dailyMinutes` outside the five options → 15; export carries `settingsRev`. The Daily time select maps 0 → "No
  limit" and the plan treats 0 as no limit. An old backup restored later re-applies the move (it has no rev) — the
  expected cost of restoring an old file.
- **Removal of the catch-up checkpoint.** No `catchUp`/`caughtUp` reads remain in js/ (grep); `checkpointDue` has
  only the soft stop; `renderCheckpoint` one body; Stop/Keep going handlers unchanged (C4-3 guards kept).
- **Covenant check.** 15 minutes at a 10 s pace → 90 views → at most 75 reviews (≈ 12.5 min plus misses) and no new
  words; 126 due after a break → 75 today, 51 held, new words back one at a time as the pile falls (`day(60)` 2,
  `day(61)` 1, `day(75)` 0: no cliff). Steps left overnight (few) are the only uncapped addition.

## Summary

No blocker. The budget arithmetic, the cap, the quota across reloads and the Meet 5 new rebuild hold up under probe
and reading, and the catch-up checkpoint is gone cleanly from behaviour. The one behaviour change worth fixing before
Steve meets it is C5-1: New words per day (and even "No limit") is now decided once a day and silently ignored until
tomorrow, with a note that then misattributes the shortfall to the budget — either re-plan on save (using the
morning's `due`, C5-2) or say "applies from tomorrow" on both settings and print the plan's own numbers (C5-3). The
rest is wording, leftovers and one design question (the soft stop at 60 inside a 75-review budget).

## Fixes (coordinator, 2026-11-07)

All eight taken. Suite: 93 JS + 50 Python. Browser (390 px, `?debug=away&words=60`): changing Daily time from 15
to 30 mid-day re-planned the day with its starting due (120) and the 2 reviews done kept. The day became "Recall 118,
Meet 8" (4 words), with the note "Your 30 minutes leave room today for 4 new words (of 5), after 120 reviews." No
console errors.
- **C5-1:** a change to New words per day or Daily time re-plans today (`replanToday`) and rebuilds the session at
  the next visit to Today. The help now says "applies straight away", and Settings re-renders so the card count is
  current.
- **C5-2:** a mid-day re-plan prices the day from its due at the start (`old.due`, or what is due now plus what was
  reviewed).
- **C5-3:** the plan records `minutes` and `newPerDay`, and the notes print the plan's own numbers.
- **C5-4:** the soft stop is offered only with no daily limit.
- **C5-5:** the note's grammar is right for 0 and 1 ("Your 10 minutes leave room today for 1 new word (of 5), after
  1 review").
- **C5-6:** `CATCH_UP_MIN` is removed; the comments in store.js and the CSS describe the budget; `held` is documented.
- **C5-7:** a Write card unlocked during the reviews joins after them.
- **C5-8:** the new-words help describes the budget and uses the actual setting.
