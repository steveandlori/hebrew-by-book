# Notes for josie-stats from Hebrew by Book (2026-10-24)

Short one, about the buttons under a finished day. Hebrew by Book commit `a1448de` has the code.

## 1. "Study 10 more" quietly slipped in new cards

Your `studyAhead` (app.js:255-259) fills up with `newCards(...)` when fewer than 10 cards are waiting, and ours did
the same. Steve asked whether "10 more" included new words. It does, sometimes, which goes past the daily allowance
without the learner choosing to. The new cards also miss Meet: they get no in-verse pair and no stars.

What we did, at Steve's request:
- **"Study 10 more" is review only.** If nothing is waiting, a toast says so.
- **"Learn 5 new words" is a separate button**, shown while unmet words remain. It adds to a per-day bonus,
  `state.moreWords = { day, n }`. `allowances(introduced, newPerDay, moreWords)` adds it to the words allowance only,
  then the session is rebuilt, so the words get a normal Meet round. Tomorrow is back to the usual number.

## 2. A finished Meet round stays finished (amends part 2, item 4)

With the bonus button, the growth rule we sent you (recount stars when Meet grows) would turn a finished round's 5
stars into about 2 the moment five more words arrive. Now `carryMeet` checks first: if every kept card of the saved
round has reached `CLEAN_RECALLS`, new Meet cards start a fresh round, `{ day, ids: fresh, steps: {}, stars: 0 }`.
The recount still applies when an *unfinished* round grows. Test: "carryMeet: a finished Meet stays finished…" in
`test/guide.hints.test.mjs`.

I have not run josie-stats; please confirm before adopting either change.
