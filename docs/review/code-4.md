# Code review 4: breaks and backlogs (2ba4dac..9f0dc7b)

Reviewer: adversarial code agent, 2026-10-26. Read-only on source. Probes:
- Throwaway Node scripts importing `store.js`, `guide.js`, `scheduler.js` by file URL (node:test mock timers for the clock).
- A Playwright browser on my own server (port 8774), driven through `?debug=away` and `?debug=done`, with `page.clock`.

Scope: `git diff 2ba4dac..9f0dc7b -- js css test`, against docs/plans/breaks-plan.md ("As built"), docs/review/plan-breaks.md,
STATUS.md decision 27, docs/agents/COMMON.md.

Test suite at 9f0dc7b: `node --test test/*.test.mjs` 87 passed. Node probe: `TZ=America/New_York` (Steve's zone).

## Findings

| id | severity | label | one line |
|----|----------|-------|----------|
| C4-1 | BLOCKER | VERIFIED (browser) | The soft-stop checkpoint never clears: `checkpointDue` returns `'soft'`, the handler sets `plan.soft`, the test is `plan.softStop`; "Keep going" shows the same checkpoint forever after 60 reviews of a large pile |
| C4-3 | SHOULD-FIX | VERIFIED (browser, `page.clock`) | A checkpoint or wrap-up left open past 4 am keeps yesterday's buttons: Stop lands on yesterday's plan and is lost, "Review 10" then starts the whole new day, "Meet 5 new" pre-clears the new day's catch-up and carries yesterday's `done` |
| C4-2 | MINOR | VERIFIED (Node) | The 4 am rollover is 3 am on the fall-back night (Nov 1 2026) and 5 am on the spring-forward night; `dayStartAt`/`dayEnd` disagree with the key for that hour |
| C4-4 | MINOR | VERIFIED / by reading | Stop at a checkpoint without a reload shows "Session done", not "Stopped for today"; it also drops a review failed just before the checkpoint (in its relearning step) for the day |
| C4-5 | MINOR | HYPOTHETICAL | The soft stop vanishes on a reload (`ordered` recomputed from the reviews left; `reviewed` restarts) |
| C4-6 | MINOR | HYPOTHETICAL | A catch-up day with no new material never sets `caughtUp`, which gates `queueWriteCard` all day, Review 10 included |
| C4-7 | MINOR (debug only) | VERIFIED (browser) | `?debug=away`'s wrap-up reports the seeded words as "met" today |
| C4-8 | MINOR | by reading | `reviewsWaiting` counts cards in their short steps; Progress "due today" ignores `writeOn` |

## Checked and sound
- **`todayPlan()` timing.** Its first call of a day is in `startSession` (nothing on the Read/Words/Progress/Settings
  routes calls it), after `debugSeed` has finished with `clockShift` back at 0, and after `importState`/`resetState`
  have replaced `state`. `backlog` counts only Review/Relearning cards due before `dayStartAt`, so the one card graded
  at the P-5 rollover only lowers `overdue` by one. The flags are reset by the day key, and a Stop made at 3:59 am
  belongs to the study day that is ending, as intended. No stale flag found except the stale-screen class in C4-3.
- **`isDue` by day, caller by caller.** Composer `recallDue`/`recallSoon` (learning cards due within minutes now
  count as due; after a stop they come back as `recallSoon`, intended), `studyAhead`'s split (selection only; the ten
  are then shuffled, which matches "takes … first"), `dueCards`, Progress "due today", the wrap-up's "next" (the
  minimum due among met cards, fine since every due-today card was in the session), `writePractice` (does not use
  `isDue`). `reviewsFirst` moves due Which cards into `reviews` and `phaseOf` 'recall'; counts and the catch-up note
  agree.
- **The catch-up checkpoint** is not double-shown (`caughtUp` persisted), not shown in Review 10 / Write 10
  (`session.mode === 'ahead'`, set by both), survives a tab change (`session.checkpoint` kept) and a reload (plan
  flags), ignores the keyboard (`onKey` returns on `!session.current`; Enter on the focused button is the button's
  own click), drops the pad first, and leaves `session.total` alone. `celebrate` cannot fire at a checkpoint: Meet
  stars only move after Meet cards, which come after it. Both checkpoints on one day (60 reviews, then "Caught up")
  is by design (P-6/P-7).
- **Stop arithmetic.** `dailyNumber()` 0 under a stop: `allowances([], 0, met + 5)` gives exactly five, again five
  after those (probe: `allowances([5 recall, 5 ctx], 0, 5)` = `{words: 0, extra: 0}`), and `extra: 0` with
  `queueWriteCard` gated keeps extras out. "Meet 5 new" after a stop survives a reload (the plan's browser check,
  and `moreWords` keyed by the day).
- **The day change in `nextCard`** cannot recurse: `startSession` sets `session.day` before `renderStudy`, and
  `renderStudy` only calls `nextCard` with a non-empty queue. `onGrade`'s re-insert into the old queue is harmless
  (the new session recomposes). `visibilitychange` is guarded on route, card and checkpoint; `session.day` null
  before the first session is a no-op.
- **Fading.** `fadingCache` is cleared with the stage cache on every grade, route change and import; it is read
  only on the Words, Read and Progress views, each rebuilt by `navigate`, so the stale window is one long-open view
  (hours, and nothing on it is actionable). Cost: one `retrievability` per recall card, cached. `st-fading` is only a
  border style on top of the stage class. The threshold 0.80 is about 2.4x the planned gap under FSRS-5's curve
  ("about three times" in the comment is loose but harmless).
- **`?debug=away` seeding.** Every clock read during seeding goes through `now()` (`applyGrade` -> `emptyCard`,
  `grade`, the log stamp, `todayKey(at)`); `store.saveState` stamps nothing; ts-fsrs takes `now` as an argument.
  Day keys land on the four earlier days (`sessions: {2026-10-15: 60}` for ten words seven days away), so the
  catch-up and the ordering show on the first load.
- **DST / month ends** elsewhere: `dayEnd` uses local components (`date + 1`), so month ends are right (tested);
  only the four-hour subtraction is wrong (C4-2).

## Summary
One real blocker: the soft-stop checkpoint loops on "Keep going" (C4-1), a one-token mismatch (`'soft'` vs
`softStop`) that no test or browser check reached because none graded past 60. One should-fix: screens left open
across 4 am keep yesterday's buttons, so a Stop is lost and Review 10 becomes the whole day (C4-3). The rest is
minor: the 4 am rollover drifts an hour on DST nights (C4-2), wording and a dropped relearning card on a no-reload
Stop (C4-4), a soft stop that a reload forgets (C4-5), a stuck `caughtUp` on dry catch-up days (C4-6), and two debug
or counting nits (C4-7, C4-8). The design itself (a persisted day plan, due by the study day, checkpoints instead of
zeroed allowances) held up under the probes; the plan's own browser check was sound as far as it went.

<!-- running notes, in order found -->

## Details

### C4-1: the soft-stop checkpoint never clears: "Keep going" shows it again (app.js `checkpointDue`, `renderCheckpoint`)
- `checkpointDue` returns the string `'soft'` and tests `!plan.softStop`; `renderCheckpoint` records the choice as
  `plan[kind] = true`, i.e. `plan.soft = true`. `plan.softStop` stays false, so the very next `nextCard` (the
  queue still holds reviews, `session.reviewed.size` is still >= 60) returns `'soft'` again. "Keep going" is a loop;
  the only way past review 60 of a large pile is "Stop for today" (or a reload, which resets `session.reviewed`).
  The `caughtUp` kind happens to match its flag name, which is why the browser check (30 reviews) did not see it.
- Status: VERIFIED by reading; browser verification below.
- Fix: return the flag name from `checkpointDue` (`'softStop'`), or map kind -> flag explicitly; add a test that
  grades 61 ordered reviews and presses Keep going.

### C4-2: the 4 am rollover moves on DST nights, and the day's bounds disagree with its key (store.js `todayKey`, `dayStartAt`, `dayEnd`)
- `todayKey` subtracts four *elapsed* hours and reads the local date. On the fall-back night (Nov 1 2026, the test
  file's own month) the night has 25 hours, so the key changes at **3:00 am** local; on the spring-forward night
  (Mar 14 2027) at **5:00 am**. Probe (Node, `TZ=America/New_York`, VERIFIED):
  - Nov 1 2026 02:59 -> `2026-10-31`; 03:00 -> `2026-11-01`, with `dayStartAt` = Nov 1 04:00, i.e. **in the future**
    (so `backlog`'s `overdue` counts anything due between 3 and 4 am as "from an earlier day").
  - Mar 14 2027 04:00 to 04:59 -> key `2027-03-13` while `dayEnd` = Mar 14 04:00, **already past**: for that hour
    `isDue` is "due before now", so nothing that comes due later on Mar 14 is due, and the first `nextCard` after
    5:00 rebuilds the session (`session.day` changed) with a second `dayPlan`.
- Severity: MINOR (two nights a year, one hour each; a 3 am study session on those nights rolls over early or late,
  and a stop made at 3:30 am on Nov 1 lands on the wrong day key). The unit tests use Nov 2 and later, so they pass.
- Fix: work in local wall-clock components: `const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getHours() < DAY_ROLLOVER_HOUR ? 1 : 0))`
  for the key and `dayStartAt`; `dayEnd` from that. Add Nov 1 2026 03:30 and Mar 14 2027 04:30 to the test.
- **Browser (VERIFIED, `?debug=away&words=40`, port 8774):** 80 overdue cards, session ordered; after 60 grades the
  checkpoint "60 reviews done / 20 more are waiting" appears. "Keep going" -> the same checkpoint; the persisted plan
  is now `{..., softStop: false, stopped: false, soft: true}`. "Keep going" again -> the same checkpoint. Severity:
  BLOCKER for any day with more than 60 due reviews (the exact case the feature is for).

### C4-3: a screen left open overnight acts on the wrong day: a Stop vanishes, "Meet 5 new" pre-clears the new day's catch-up, Review 10 becomes the whole day (app.js `renderCheckpoint`, `learnMoreWords`, `studyAhead`, `visibilitychange`)
- The day check lives in `nextCard`, and `visibilitychange` acts only on a finished screen with no checkpoint. A
  checkpoint or wrap-up left on screen past 4 am (common: he stops at "Caught up" to decide, goes to bed, the
  laptop stays on the page) keeps yesterday's buttons live, and each one reads a different day:
  - **Stop at a stale checkpoint (VERIFIED, Playwright `page.clock`, `?debug=away&words=10`, 9 pm -> 10 am next
    day):** `renderCheckpoint` captured yesterday's `plan` object at render time, so `plan.stopped = true` lands on
    yesterday; the screen shows yesterday's "Session done"; `todayPlan()` then builds today's plan with
    `stopped: false`. Pressing "Review 10" next ran `nextCard` -> `startSession()`: the whole new day (Meet 20 left,
    Deepen 6, Tell apart 4), not ten reviews. His stop was silently lost and his Review 10 press hijacked.
  - **"Meet 5 new" at a stale wrap-up (VERIFIED, `?debug=done`, 9 pm -> 10 am):** `learnMoreWords` calls
    `todayPlan()` (today's fresh plan) and sets `caughtUp = true` on it before any review has been done; on a
    catch-up day that skips the "Caught up" checkpoint and composes with `reviewsFirst` false (by reading). It also
    keeps `session.done` from yesterday (`keepDone: true`), so tonight's wrap-up counts yesterday's cards.
  - `studyAhead`/`writeAhead` on a stale screen build an "ahead" queue that `nextCard` immediately throws away.
- Severity: SHOULD-FIX. Fix: one guard at the top of `learnMoreWords`, `studyAhead`, `writeAhead` and both
  checkpoint handlers: `if (session.day !== store.todayKey()) { startSession(); return; }`; and have the handlers
  call `todayPlan()` rather than close over `plan`. Or extend the `visibilitychange` rebuild to checkpoints (a
  checkpoint shows no card, so nothing is lost) and to `pageshow`/`focus`.

### C4-4: Stop at a checkpoint without a reload shows "Session done", and drops cards part-way through their steps (app.js `renderCheckpoint` stop handler)
- VERIFIED (browser, `?debug=away&words=10`): 20 reviews, "Caught up", Stop -> the wrap-up ("Session done, 20
  cards answered"), not "Stopped for today"; the plan's claim that Stop shows "Stopped for today" holds only after
  a reload (`session.done` is 0 then). The wrap-up does carry the "N reviews wait for tomorrow" line, so it is a
  wording inconsistency, not a loss.
- By reading: the handler sets `session.queue = []`, so a review failed just before the checkpoint (Relearning,
  re-inserted 3-5 cards on, i.e. among the Meet cards) is dropped for the day, although the comment in
  `startSession` promises "cards part-way through their steps still finish". A reload brings it back (recallSoon);
  without one it waits until tomorrow as an overdue relearning card. MINOR.
- Fix: on Stop keep `session.queue.filter(c => inSteps(c))` (same test as the composer's `recallSoon`), and render
  the stopped screen when nothing is left rather than the wrap-up, or say "Stopped for today" in the wrap-up's h2.

### C4-5: the soft stop disappears on a reload, and its counter is per session (app.js `startSession`, `checkpointDue`)
- HYPOTHETICAL (by reading). `ordered` is recomputed at every `startSession` from the reviews *still* due; after 50
  reviews of an 80-card pile a reload leaves 30 (<= `BACKLOG_ORDER_MIN`), so `ordered` is false and `session.reviewed`
  is empty: no soft stop is ever offered that day, though 80 reviews are done. Conversely a reload at 59 reviews
  restarts the count. The plan review (P-7) asked for one counter; the as-built counts the session. MINOR; fix by
  counting from `state.sessions[day]` or a per-day set in `dayPlan`, and deciding `ordered` from `plan.overdue`
  (persisted) rather than the live pile.

### C4-6: a catch-up day whose queue runs dry never sets `caughtUp`, which gates Write cards for the rest of the day (app.js `checkpointDue`, `queueWriteCard`)
- HYPOTHETICAL (by reading). The checkpoint fires only when a non-recall card is next. With the day's new words
  used up (or `newPerDay` 0) and no extras, the queue empties after the reviews: wrap-up, no checkpoint,
  `plan.caughtUp` stays false. `queueWriteCard` then returns early for every ctx/form grade of that day, including
  in Review 10 / Write 10 sessions (it is called from `onGrade` in every mode), so no Write the Hebrew card unlocks
  mid-session that day. MINOR. Fix: in `checkpointDue`, when the queue is empty on a catch-up day set
  `plan.caughtUp = true`; or gate `queueWriteCard` on `session.mode === 'today'` as well.

### C4-7: `?debug=away` reports the seeded words as "met" today in the wrap-up (app.js `debugSeed`)
- VERIFIED (browser): the catch-up day's wrap-up says "10 words met" with the list, because `state.dayStart` is
  taken before the seeding under today's key, while the words are then introduced on earlier days. Debug only;
  MINOR. Fix: set `state.dayStart` after the loop (as the stages stand when the day begins), or null it for `away`.

### C4-8: small counting mismatches around "due today"
- `reviewsWaiting()` counts every met card due before 4 am, including cards in their short steps that a reload would
  put straight back into the session ("N reviews wait for tomorrow" overstates by those). Progress's "due today"
  (`dueCards`) does not apply `writeOn`, so with Write the Hebrew Off it still counts write cards (pre-existing
  under the old label too). Both MINOR, by reading.

## Fixes (coordinator, 2026-10-26)

All eight taken. Suite: 88 JS + 50 Python. Browser (Playwright, `page.clock`, 390 px, `?debug=away`), no console
errors.
- **C4-1:** `checkpointDue` returns the dayPlan flag names (`'softStop'`, `'caughtUp'`). Browser: 60 reviews → offer
  → Keep going → the next card, and no second offer (`softStop: true`). My earlier browser pass had only pressed Stop.
- **C4-2:** `studyDate` uses local clock components; tests for Nov 1 2026 03:30 and Mar 14 2027 04:30.
- **C4-3:** `staleDay()` at the top of Review 10, Write 10, Meet 5 new and both checkpoint buttons; handlers read
  `todayPlan()` afresh. Browser: Caught up left open from 8 pm to 10 am next day, then Stop → the new day's session
  (`dayPlan.day` 2026-11-13, not stopped).
- **C4-4:** Stop keeps cards part-way through their steps; the wrap-up after a stop is titled "Stopped for today".
  Browser: "Stopped for today … 20 reviews wait for tomorrow, most at risk first."
- **C4-5:** `dayPlan.ordered` is sticky for the day and the distinct reviews are kept in `dayPlan.reviewed`, so a
  reload part-way still offers the stop.
- **C4-6:** a catch-up day whose session runs dry is marked caught up; the write-card gate applies only in the day's
  own session.
- **C4-7:** `?debug=away` takes its day-start baseline after the back-dated seeding.
- **C4-8:** `reviewsWaiting` counts cards in review only; Progress "due today" respects Write the Hebrew Off.
