# Notes for josie-stats from Hebrew by Book, part 2 (2026-10-23)

Thanks for the stars notes: all five applied here and are fixed (Hebrew by Book `3675fd9`). An adversarial code
review (`docs/review/code-2.md`) and a browser QA run (`docs/review/qa-2.md`) of the same code then found the four
problems below. I read josie-stats at `086a409`: each one's code is present there too, but I have not run your app,
so please confirm each before fixing. Hebrew by Book's fixes are in commit `4d664d0`, which has the file
paths.

## 1. Pad: the "frame" model loses ink and shrinks it (two bugs, one cause)

Your `js/pad.js` (lines 18-32, 79-80) fits a "frame", the largest surface written on at full size, not the ink.

- **QA's F1 (VERIFIED in a browser):** after writing in full screen, a stroke made on the small pad does not appear
  when the pad goes full screen again. On the small pad the scale is limited by its height (150/729 ≈ 0.2), so a
  point's frame x = screen x ÷ 0.2, which runs far past `frame.w`. Full screen then draws it off the right edge.
- **Review's C2-4 (VERIFIED in a DOM stub):** with ink on the small pad, expand, draw one stroke, press Done. The
  frame has grown to the whole full-screen surface, so the earlier ink redraws at about 25%, and every pen stroke
  is 2.5 × scale = 0.6 px, a hairline. The answer image at reveal is just as small.

**Fix (Hebrew by Book `js/pad.js`; the file drops in, since `snapshot()`/`restore()` keep their shape):**
- Fit to the extent of the pen ink: `scale = min(1, cssW / inkW, cssH / inkH)`, where inkW and inkH are the far
  edges of all pen points plus their width.
- Each path stores its own width in ink units at the moment it is drawn: `w = PEN_WIDTH / scale`. A new stroke is
  2.5 px on screen whatever the scale; shown widths have a floor of 1 px.
- The `frame` variable is gone. `snapshot()` returns `{ paths }` with `w` on each path; `restore()` defaults `w` for
  old snapshots.

**Verified in Playwright at 390×844:**
- Full-screen ink, back, a stroke at the small pad's far right, full screen again: the new stroke shows.
- Every further round trip draws identically.
- The one trade-off: a stroke added on the small pad sits, at full size, beyond the earlier full-screen writing. The
  next full-screen view shrinks everything a little to keep it all in view, rather than lose it.

## 2. Keys reach the card while the pad is full screen

Your `onKey` (app.js:524) does not check the pad. With focus on the canvas or the body, `h` gives a hint (the
re-render collapses the pad) and space reveals. Fix: `if (session.pad && session.pad.isExpanded()) return;` near the
top of `onKey`. Verified here: `h` with the pad full screen now does nothing.

## 3. The wrap-up's "met / graduated / now solid" restarts on a same-day rebuild (QA's F2)

`session.stagesBefore` is computed in `startSession` (your app.js:248). A reload, or your Which formula? tab, rebuilds
the session, so the baseline becomes "now". After a reload the wrap-up said "0 words met" where the same run
without one said 3.

Fix: keep the day's first baseline in state, `state.dayStart = { day, stages: [...map] }`, kept by `loadState` and
`importState`. On a same-day start, reuse it; on a new day, compute and save it. Verified here: reloading mid-session
still gave "3 words met, 3 graduated".

## 4. `carryMeet` keeps 5 stars after Meet grows (review's C2-7, minor)

If the daily allowance is raised mid-day and the session rebuilt, new Meet cards join under stars already earned (5
stored, 2 computed). Fix in `carryMeet`:

```js
const grew = fresh.some(id => !saved.ids.includes(id));
const stars = grew ? Math.min(saved.stars || 0, meetStars(Object.values(saved.steps), ids.length)) : (saved.stars || 0);
```

Test: `test/guide.hints.test.mjs`, "carryMeet: stars earned stay unless Meet grew…".

## Not for you (Hebrew-only)

The rest of the findings concern Write the Hebrew cards (the answer visible elsewhere in the verse, written/read
places, hint order) and that setting's Off switch. They have no counterpart in josie-stats.
