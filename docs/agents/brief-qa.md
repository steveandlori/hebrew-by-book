# Brief: QA run with a written test plan

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Report file: `docs/review/qa-1.md`.

## Setup
- Start the no-cache dev server: `python scripts/serve.py 8770`. It blocks, so run it with your shell tool's
  background option if you have one, or from a short Python launcher script that starts it as a subprocess and
  exits; stop it at the end. The app is at `http://127.0.0.1:8770/`.
- Drive the app with the Playwright browser tools (navigate, click, evaluate, screenshot). Start every scenario from a
  clean state: `localStorage.clear()` then reload.
- **Faked clock** for multi-day scenarios: before the app loads, install a `Date` override whose offset comes from
  `localStorage['qa-offset-ms']` (e.g. via `page.addInitScript` if available, or by navigating to `about:blank`,
  setting the key, and injecting the override in an init script). Advance by setting the key and reloading.
  If you cannot fake the clock, say so and run what you can; do not report a scenario you did not run.

## Scenarios (record PASS / FAIL / NOT RUN with evidence for each)

1. **First visit**: `/#today` on a clean state lands on `#method` (h1 "How it works"); `.refs li` count 23; every
   `.cite a` number has a matching `#ref-N`. Clicking "Start today's session" shows Today.
2. **Day 1 composition** (newPerDay 10): the phase strip shows only "Meet 20". Card kinds alternate as recall
   (`.lemma .heb` present) then ctx (exactly one `.verse .w.hl`).
3. **Hint ladder**: on a recall card, `#hint` three times gives `.hints li` labels Part of speech, In Ruth X:Y (with a
   `.verse` inside), The meaning starts with; the fourth press reveals. A hinted card shows a single "Next" button
   (`[data-auto]`), and grading it advances.
4. **Grading and keyboard**: on an unhinted card, Space reveals; keys 1/2/3 grade (3 buttons by default).
5. **Writing pad**: draw a stroke on the canvas; reveal; `.compare img` appears beside "The meaning".
6. **Seven-day simulation**: each day, answer every card "Got it" (or the right choice on Which word? cards), then
   advance the clock 1 day. Expected: each day introduces at most 10 new recall cards (check `newIntroduced` in
   `localStorage['hebrew-by-book-v1']`); from day 2, Deepen (`form`) and Tell apart (`which`) phases appear; no card id
   appears twice in one session's queue; the wrap-up screen appears each day; Progress shows graduated words and a
   coverage percentage above 0; the momentum bars show the days studied. Note anything that looks wrong.
7. **Which word?**: a `which` card shows 4 `.choice` buttons, each with Hebrew (`.heb`) and a gloss; exactly one is
   the right answer; a right pick shows "Right, next", a wrong pick marks `[data-result="wrong"]` and the right one.
8. **Read**: `#read/3` shows 18 `.vblock`s. In 3:3, two `.kq` groups; pointed mode: each has `.kq-mark` "ק" and a
   `.kq-alt` containing the written consonants (שמלתך, וירדתי). Tap the read form of וְשָׁכָבְתְּ in 3:4: `#sheet` shows a
   `.kqbox` with Written (…1cs) and Read (…2fs). 3:12 has a `.kq-lone` (written, not read). 3:5 has a `.kq-lone`
   (read, not written). Switch Settings → Unpointed: the 3:3 groups lead with ketiv consonants and mark "כ".
   Glosses toggle shows `.gl` under words; "Show what I know" toggles stage underlines; "Pick a verse for me" moves to a
   verse and focuses it. `#read/2.10` scrolls to and highlights 2:10.
9. **Written and read**: `#kq` lists 13 `.kqitem`s; opening one shows both readings with parses. The page text contains
   none of: "error", "mistake", "corrected", "correction", "wrong".
10. **Words**: `#words` lists 285 entries; search "redeem" finds גָּאַל; search with Hebrew "גאל" also finds it;
    `#words/H559` opens that entry; sorting by frequency puts אָמַר first.
11. **Names**: `#names` lists the names (Ruth, Naomi, Boaz, Orpah, Elimelech among them) with reference links that
    open Read at that verse.
12. **Settings**: pointing and Hebrew size survive a reload; export then import restores progress (card count equal);
    "Start over" (accept the confirm dialog) clears progress.
13. **Layout and errors**: at 390×844 and 1100×900, light and dark (`document.documentElement.dataset.theme='dark'`),
    on Today, Read, Words, Progress: `document.documentElement.scrollWidth <= innerWidth`; no console errors anywhere
    in the run. Take a few screenshots of the Hebrew at phone width and judge legibility (vowel points under the right
    letters, brackets and marks readable).

Report: a table of scenarios with PASS/FAIL/NOT RUN and evidence, then defects (severity, steps, expected, actual),
then a verdict: SHIP or FIX FIRST. Keep it under ~200 lines.
