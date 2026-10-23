# Notes for Hebrew by Book from josie-stats (2026-10-23)

josie-stats ported the vector-ink pad and the Meet stars from your handoff (josie-stats `111a2c9`, `f5b6354`). Its review
and QA of the stars found the issues below. Each one applies to Hebrew by Book as far as I can tell from reading your
`js/app.js` and `js/guide.js`, but I have not run your app. Please confirm each one before fixing it. The josie-stats
code for each fix is linked so you can lift it.

## 1. Earned stars vanish on a page reload (bug; breaks "a star once earned stays")

**Cause.** `session.meetStars` and `session.meetSteps` live only in memory. A reload calls `startSession()`, which
zeroes them. Meet cards already graded today are no longer new, so the composer files the ones still in learning under
Recall. Meet is rebuilt from the smaller allowance that is left. The chip then shows 0 of 5 stars, or no Meet at all.
josie-stats also lost stars on a visit to its Which formula? tab, which rebuilds the session. You have no such tab, so a
reload is your only path. Check whether anything else in your app calls `startSession()` mid-day.

**Fix in josie-stats.**
- A pure `carryMeet(saved, day, phaseOf)` in `js/guide.js`, with tests in `test/guide.hints.test.mjs`.
- Today's Meet progress is stored as `state.meetDay = { day, ids, steps, stars }`, kept by `loadState` and by
  `importState` in `js/store.js`.
- On a same-day rebuild, today's Meet ids that are still queued go back under Meet. Steps and stars are restored, and
  `counts.meet = ids.length`.
- `onGrade` writes each step and the stars back to the stored state and persists it.
- On a new day, the saved progress is ignored.

**The trap in our first version.** Keep a saved id only if it has been graded or is still queued:
`saved.ids.filter(id => id in saved.steps || phaseOf.has(id))`. Otherwise a smaller rebuild strands cards at step 0 in
the denominator, and the stars stop at 3 of 5 even after every queued Meet card has graduated. QA reproduced this
before the fix and confirmed the fix afterwards.

## 2. Screen readers hear the star glyphs (accessibility)

**Cause.** The `.burst` has `role=status`, and its text contains "★★★★★", which is read as "black star" five times.
Inserting a `role=status` element with its text already in place is often not announced at all; NVDA with Chrome is a
known case. The card's own `aria-live` re-render in the same tick also competes with it.

**Fix in josie-stats.**
- One `<div id="announce" class="sr-only" role="status" aria-live="polite">` in `index.html`.
- `celebrate(text, spoken, cls)` sets the burst to `aria-hidden="true"`, empties `#announce`, and 50 ms later sets it to
  plain words ("Meet: 2 of 5 stars", "Meet complete: all 5 stars").
- The chip count also carries a hidden " left," so a screen reader says "Meet 3 left, 2 of 5 stars".

## 3. Smaller items

- **Windows high-contrast (forced colors).** The empty stars use `color: transparent` with a text stroke, which may
  render all five as filled. josie-stats added
  `@media (forced-colors: active) { .stars i { color: CanvasText; -webkit-text-stroke: 0; } .stars i:not(.on) { opacity: .3; } }`
  and QA confirmed it with Playwright's forced-colors emulation.
- **`CLEAN_RECALLS = 3` is a copy of `learning_steps.length`.** josie-stats added a test that runs a new card through the
  real scheduler with `CLEAN_RECALLS` Good grades and asserts it reaches Review only on the last one.
- **Start over and import resume the old session.** Your `resetSession` already handles this. josie-stats lacked it
  and now sets `session.day = null`.
- **Method wording.** "Only Got it counts toward the three clean recalls a card needs to graduate" is true for new cards
  only. A lapsed card relearns in one step (`relearning_steps: ['10m']`), so josie-stats now says "a new card needs".
  Your `js/method.js:136` has the same sentence.
- **QA hygiene.** A josie-stats QA subagent stopped its test server by killing every `python.exe` on the machine. Tell QA
  agents to stop only their own server by PID.

## Decided and not changed (for consistency between the two apps)

A reviewer argued that each star burst follows a self-graded Got it, which could tempt kind grading. Steve had already
settled this in your app: stars are milestones, like distance markers on a run, never rewards for being right. A star
once earned is never taken back, and sparks appear only where the app does the grading. josie-stats kept that design
as is.
