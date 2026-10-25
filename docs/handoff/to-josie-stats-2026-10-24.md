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

## 3. How it works opens on every fresh load, not just the first (found later the same day)

Steve: the app "defaults to How each time I load it fresh". The first visit rewrites the address to `#method`
(your app.js:730 does the same). A bookmark, home-screen icon or restored tab keeps that address, and `navigate()`
honours it, so every later load opens How it works even though `introSeen` is true. The fix, just before the startup
`navigate()` (your app.js:746):

```js
if (state.settings.introSeen && location.hash === '#method') {
  try { history.replaceState(null, '', '#today'); } catch (e) { /* ignore */ }
}
```

Checked in Playwright: the first visit shows How it works; a reload, or opening a `#method` bookmark, opens Today;
the How tab still opens it. One trade-off: reloading while reading How it works lands on Today.
