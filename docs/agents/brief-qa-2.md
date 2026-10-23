# Brief: QA of the 2026-10-23 features, in a real browser

Read `docs/agents/COMMON.md` first, including **Test servers**. Report file: `docs/review/qa-2.md`.

You have Playwright browser tools (`mcp__plugin_playwright_playwright__*`; load them with ToolSearch). Serve the repo
with `python -m http.server 8772 --bind 127.0.0.1` from `C:\Users\steve\claude-here\hebrew-by-book`, run with
`run_in_background`. Stop only that server when you finish. If you edit nothing, the browser should load fresh code;
if it ever seems to run stale modules, switch to a new port (8773 and up).

Set progress by writing `localStorage['hebrew-by-book-v1']` (see `js/store.js` for the shape; cards are ts-fsrs cards,
dates as ISO strings) and reloading. Settings: `introSeen: true` skips the intro.

## Step 1: write your test plan first

Put it at the top of your report before running anything: numbered scenarios, each with steps and the expected
result. Cover at least these:
1. **Writing pad**, at 390×844 and at 1280×900: write, go full screen, come back, repeat three times. The ink must be
   the same size each time it is full screen. Also test the eraser, Clear, and a hint while the pad holds ink.
2. **הוּא and הִיא** are separate in Words, each with a "Don't confuse" note. A tap on הִיא in Read (1:3) shows "she".
3. **Meet stars** over a full 10-word Meet round. Check:
   - that they are evenly spaced;
   - a reload mid-Meet: stars kept, and Meet still counted;
   - "Not yet" grades, so a star is never taken back;
   - the wrap-up stars;
   - `#announce` text;
   - dark mode and forced colors, via `page.emulateMedia`.
4. **Which word? spark** on every 3 right in a row, and none after a wrong pick.
5. **Write the Hebrew**: the unlock after N in-verse views for each of 1, 2, 3, 5 and Off. Check:
   - the blank hides the word (the word's Hebrew must not be in the DOM before reveal);
   - the cue is shown;
   - the hint ladder for both forms (dictionary form / as in the verse);
   - the reveal shows both forms;
   - unpointed mode;
   - switching settings mid-session.
6. **Daily caps.** With `newPerDay` 3, count the new deepen/write/which cards introduced in one day, including
   "Study 10 more" and a reload.
7. **The Haktuvim link** on every chapter in Read: right URL (`https://haktuvim.co.il/study/Ruth.N`), new tab.
8. **Regressions.** Keyboard shortcuts, the Read sheet, Written and read, Words, Progress, Settings, export/import,
   Start over, and no console errors anywhere.

## Step 2: run it

Record pass or fail per scenario with evidence: values read from the DOM, and screenshots saved under
`.playwright-mcp/qa2-*.png`. For each failure give exact reproduction steps and label it VERIFIED. End with a verdict
(SHIP or FIX FIRST) and the top issues. Keep it under about 250 lines.
