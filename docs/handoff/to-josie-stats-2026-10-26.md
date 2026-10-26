# Notes for josie-stats from Hebrew by Book (2026-10-26): breaks, backlogs, due by the day

Steve asked what happens when he misses days. Hebrew by Book researched it (docs/research/breaks.md), planned it,
had the plan reviewed adversarially (docs/plans/breaks-plan.md, docs/review/plan-breaks.md), and built it. Item 1
applies to you as you are today. Items 2–4 apply if you want the same behaviour. I have not run josie-stats; please
confirm before adopting.

## 1. Due by the minute makes reviews run about 1.5× late (your app.js:122)

`isDue` is `c.due <= at`, and ts-fsrs sets due to the millisecond. With one session a day, a card due at 3 pm waits
for tomorrow's noon session. In a simulation using the app's own scheduler as the learner, the actual gap averaged
1.6× the planned interval. Counting a card as due for its whole day, as Anki does, brought that to 1.0 and halved
forgotten cards, for about the same daily time.

What we did:
- `store.todayKey(d)` keys a 4 am-to-4 am study day (`d − 4 h`), so a late-night session counts as the same day.
- `dayStartAt(d)` and `dayEnd(d)` give the rollovers either side.
- `isDue` is `c.due < dayEnd(at)`.
- Your `resumeOrStart` refill (app.js:713 onwards) becomes dead code, since nothing new comes due after the session is
  built. We removed ours.

## 2. Catch-up as a checkpoint, not a zeroed allowance

On a day that starts with 15 or more reviews overdue from earlier days:
- reviews come first;
- then a checkpoint: "Caught up … Meet N new / Stop for today".

Zeroing the new allowance (our first plan) broke "Meet 5 new" and made reloads inconsistent.

## 3. Keep the day's choices: `state.dayPlan = { day, catchUp, overdue, caughtUp, softStop, stopped }`

- A stop survives a reload and a tab change.
- After a stop, the day's own number is 0, but the bonus words still add.
- The day change is checked in `nextCard`, so a card left on screen overnight is not lost.

## 4. A large pile (over 60) comes most at risk first, in shuffled blocks of 20, with an offer to stop after 60
distinct reviews

In the model the order changes the comfort of the return, not what is kept. A "may have faded" mark (predicted recall
under 0.80) sits beside the stage and is never a stage.

Testing tip: Playwright's `page.clock.install({ time })` before load, then `page.clock.fastForward(ms)` and a reload,
walks through a week away in a few minutes. Pass milliseconds: '192:00:00' is rejected. `node:test` `mock.timers`
mocks `Date` for unit tests.

## Addendum: from our code review of the above (docs/review/code-4.md)

- **Roll the day over by local clock components,** not "four hours earlier":
  `new Date(y, m, d - (hours < 4 ? 1 : 0))`. Subtracting elapsed hours moves the rollover to 3 am or 5 am on
  daylight-saving nights.
- **Any button on a screen that can be left open overnight** (a wrap-up, a checkpoint) should start the new day
  first. Ours did not, and a Stop on yesterday's checkpoint stopped yesterday's session.
- **If a checkpoint's kind doubles as the flag it sets, name them the same.** Ours returned 'soft' but tested
  'softStop', so Keep going came back on every card.
