# Code review 3: the 2026-10-24 evening changes (0bae87b..c03321d)

Reviewer: adversarial code agent, 2026-10-25. Read-only on source. Probes:
- Throwaway Node scripts that import `data/ruth.js`, `deck.js`, `render.js` and `guide.js` (every card's pool through
  `variantFor`; `allowances`, `carryMeet`, `writePractice` edge cases).
- A Playwright browser on my own server (port 8773), driven through the debug links, with scripted grading loops.

Test suite at c03321d: `node --test test/*.test.mjs` 78 passed.

## Findings

| id | severity | label | one line |
|----|----------|-------|----------|
| C3-1 | SHOULD-FIX (design) | VERIFIED | Rotation runs inside Meet: a brand-new word's in-verse card comes back one minute later in a different verse, and for 33 of the 97 rotating words in a different spelling (הָלַךְ: וַיֵּלֶךְ, then תֵלַכְנָה, then לֵכְןָ) |
| C3-2 | SHOULD-FIX | VERIFIED | Keyboard: on a Write card revealed through hints (auto-graded), Enter or Space on the "Practice?" summary grades the card instead of opening the fold |
| C3-3 | MINOR | VERIFIED | "Meet 5 new" grants `newPerDay + 5 - met`, not 5: raise new words per day 10 → 20 after the day's session and the button gives 15 words (30 Meet cards); lower it and the button can give 1 |
| C3-4 | MINOR (debug only) | VERIFIED | `?debug=card&card=<id>:which` can show the four choices of a different word, none of them the answer |
| C3-5 | MINOR | VERIFIED | The expanded Practice pad sits 6 px below the top of the screen (`.practice .pad` margin beats `.pad.expanded`), unlike the main pad |
| C3-6 | MINOR (debug only) | VERIFIED | `?debug=help` also seeds ten words, shows a day's card under the help list and toasts "Debug: no such card" |
| C3-7 | MINOR | VERIFIED | Meet 5 new restarts the session counter: the wrap-up's "cards answered" and progress bar cover only the new round |

## Details

### C3-1: rotation inside Meet (deck.js `variantFor`, app.js `nextCard`)
- **What happens:** `nextCard` keys the variant on FSRS `reps`, and `reps` counts every grade, including the three
  learning steps a new card takes in its first session. So a new word's in-verse card shows verse 1 at its first view,
  verse 2 one minute later (after the first Got it) and verse 3 ten minutes after that. The ctx pool holds every
  spelling no "Another form" card claims, so for verbs those verses often show forms the learner has never seen.
- **Repro (browser, `?debug=today`, scripted Got it on every card):** אֵת's in-verse card was shown at Ruth 1:6, graded
  Got it, and came back three cards later at Ruth 2:9, still inside Meet.
- **Probe over the deck (day-1 words, pool order = view order):**
  - H1980 הָלַךְ: 1:1 וַיֵּלֶךְ → 1:11 תֵלַכְנָה → 1:12 לֵכְןָ (11 spellings in the pool);
  - H1961 הָיָה: 1:1 וַיְהִי → 1:11 וְהָיוּ → 1:12 מִהְיוֹת;
  - H935 בּוֹא: 1:2 וַיָּבֹאוּ → 1:22 בָּאוּ → 2:3 וַתָּבוֹא;
  - H376 אִישׁ: 1:1 אִישׁ → 1:3 אִישׁ → 1:9 אִישָׁהּ.
  - Over all 97 rotating ctx cards, the 2nd view changes spelling for 33 and the 3rd for 27; 70 change chapter.
- **Why it matters:** Meet is described (guide.js, How it works) as meeting the word "in its verse", and the
  "Another form" cards exist to introduce other spellings once the word has graduated. Steve's complaint (decision 23)
  was repetition across days; this also changes the first ten minutes. It may be what he wants (desirable difficulty),
  so it is filed as a design question rather than a bug, but it was not stated in decision 23 ("First views are as
  before").
- **Fix (if unwanted):** key the variant on reviews after graduation, e.g. `reps - learningReps` or
  `state === Review ? reps : 0`; or keep `pool[0]` while the card is in Learning. A cheaper middle: rotate verses but
  keep the ctx pool to the first spelling until graduation.

### C3-2: Enter/Space on "Practice?" grades the card (app.js `onKey`)
- **Repro (browser, `?debug=write`):** press "Give me a hint" until "Show me" reveals the card; the grade is now the
  automatic "Next" (`data-auto`). Tab to the "Practice?" summary and press Enter (or Space). The card is graded Not
  yet and shown again unrevealed; the fold never opens. Control: the same keys on a self-graded reveal (no hints) open
  the fold and build the pad.
- **Why:** `onKey` ignores keys only when `e.target` is input/select/textarea/button/a. `<summary>` is focusable but not
  in that list, and in the auto-grade branch Enter/Space call `preventDefault()` and click the Next button.
- **Also affected (pre-existing):** the "Full parse" summary on every revealed card, and the hint-list summaries, under
  the same condition.
- **Fix:** add `summary` (or any element with a focusable role, e.g. `e.target.closest('summary, details')`) to the
  ignore list in `onKey`.

### C3-3: "Meet N new" promises 5 and grants the allowance (app.js `moreButtonsHTML`, `learnMoreWords`)
- **Repro (browser, `?debug=done`):** the wrap-up shows "Meet 5 new". Settings → New words per day 20 → Today
  (the wrap-up again, still "Meet 5 new") → press it: the strip shows Meet 30 left, i.e. 15 words.
- **Probe:** `allowances(10 met, newPerDay 20, more 5).words` = 15; `allowances(9 met, newPerDay 5, more 5).words` = 1.
- **Why:** the label is `min(5, wordsLeftToMeet)`, but the press adds 5 to `moreWords` and then takes the whole of
  `newPerDay + moreWords - met`.
- **Fix:** set `moreWords` so the allowance comes out at exactly 5 (`n = 5 + met - newPerDay`, floored at the current
  value), or label the button with the real allowance.

### C3-4: stale Which word? choices in the debug view (app.js `debugView`)
- **Repro (browser):** `?debug=card&card=H1980:which` showed the choices H834c, H853, H834a, H834d; the answer H1980 was
  not among them. (First load; the chance depends on the seeded day's first card.)
- **Why:** `debugSeed` seeds ten words, `navigate()` composes and renders the day's first card, and when that card is a
  Which word? card `renderStudy` fills `session.choices`. `debugView` then replaces `session.current` but does not
  reset `choices`, so the next render reuses them.
- **Fix:** include `choices: null, picked: null, hints: 0, sketch: null` in `debugView`'s `Object.assign`.

### C3-5: expanded Practice pad margin (css/style.css)
- **Measured (browser, 360 × 740, `?debug=card&card=H4909:write&practice=1`, Write bigger):** the practice pad's
  `.pad.expanded` has `margin-top: 6px`, top 6, height 734; the main pad has 0 and 740.
- **Why:** `.practice .pad { margin-top: 6px }` (line 484) has the same specificity as `.pad.expanded { margin: 0 }`
  (line 345) and comes later.
- **Fix:** `.practice .pad:not(.expanded) { margin-top: 6px }`, or move the rule above `.pad.expanded`.
- **Checked and fine at 360 px:** the longest title in Ruth, "Copy מַשְׂכֹּרֶת or מַשְׂכֻּרְתֵּךְ", fits without ellipsis
  (236 px); escaping of both forms; `body.pad-open` set and cleared; onKey silent while expanded.

### C3-6: `?debug=help`
- **What happens:** `help` is not a scenario, so `debugSeed` treats it like `done` (seeds ten words), `navigate` shows the
  first deepen/tell card of that day under the help banner, and `debugView` toasts "Debug: no such card".
- **Fix:** return early from `debugSeed`/`debugView` when `DEBUG` is not in `DEBUG_SCENARIOS`. (Also, `in` on a plain
  object makes `?debug=constructor` a "known" scenario whose description is `function Object() { [native code] }`;
  harmless, but `Object.hasOwn` is the right test.)

### C3-7: Meet 5 new resets `session.done`
- **What happens:** `learnMoreWords` → `startSession` sets `done = 0` and `total = queue.length`. The second wrap-up's
  big number and the progress bar count only the new round; the stage diff still uses `dayStart`, so "words met" is
  right.
- **Fix:** carry `done` across (`startSession({ keepDone: true })`), or accept it and say "this round".

## Checked and sound

- **Scratch storage.** `useScratchStorage()` runs before `loadState()`; nothing else touches `KEY` first. With a
  sentinel in `hebrew-by-book-v1`: grading, Settings → Start over and Import in a debug run left the real key byte for
  byte as it was (browser). Tabs and `history.replaceState('#…')` keep the query, so a debug page stays on scratch
  until the "Leave debug" link (a real navigation to `location.pathname`).
- **Banner escaping.** `?debug=<img src=x onerror=…>` renders as text; no element, no execution. `card=`, `words=`,
  `reps=` are never interpolated.
- **Bad parameters.** `reps=-1` or `1.5` index past the pool and fall back to the card's own token with `blank` cleared;
  no rotating Write card in Ruth carries a blank list (the 11 that do have a pool of one), so nothing leaks.
  `words=99999` seeds all 287 words (slow but bounded; the log is capped at 5000).
- **Startup hash rule.** No loop (`replaceState` fires no `hashchange`); a `#method` load with `introSeen` opens
  Today; the How tab still opens How it works; a first visit shows How it works and a reload mid-intro goes to Today
  (by design); `#read/2.3` and other deep links untouched; `?debug=fresh` still gets the intro.
- **Allowances.** `moreWords` adds to words only; `extra` is unchanged. Write 10's unstarted cards are counted by
  `applyGrade` into `newIntroduced`, so afterwards `extraAllowance()` is 0 for the day: `queueWriteCard` adds nothing and
  a reload's `composeSession` introduces no more form/which/write cards. Conservative, never over.
- **Queue integrity.** Review 10, Write 10 and Meet 5 new all start from an empty queue with `current` null. A
  requeued learning card is a variant object, but `queueWriteCard` compares the DECK object only for `isNew` cards,
  which are always queued as DECK objects, so `includes` still works; a graded write card is not new and returns early.
  `resumeOrStart` only appends when the queue is empty.
- **`carryMeet`.** A finished round (all kept steps = 3) plus new Meet ids starts a fresh round; a reload mid-round
  keeps steps and stars; a finished round reloaded with no new words keeps 5 stars; a Meet card graded Not yet during
  Review 10 drops to step 0 and climbs back to 3 before the wrap-up, so the round is finished again by the time Meet
  5 new can be pressed; a dropped id (never graded, no longer queued) is left out of `kept`.
- **Rotation plumbing.** `variantFor` is applied in `nextCard` for every path into `session.current` (composer,
  requeue, `queueWriteCard`, `resumeOrStart`, debug). Hints, nudge, `backHTML`, `padTitle`, the compare target and the
  Write cue all read the variant. A re-render (hint, reveal, Settings and back, pointing change) keeps `session.current`,
  so the verse never changes under a card; Off for Write clears it and moves on. `blank: undefined` before the spread
  stops a stale blank. The deck tests cover every pool entry: own-word tokens, form spelling kept, Write never shows the
  answer, one place per verse, first view as before. The 4 pools that hold a ketiv token (H2962, H8071 form/which) have
  one entry, so nothing new is shown there.
- **Practice pad lifecycle.** Built once on first open; destroyed on every `renderStudy`, `dropPad`, `navigate`; its
  keydown/resize listeners go with it. Grading while it is expanded is impossible (fixed overlay, `onKey` silent);
  Escape collapses it; browser Back destroys it cleanly. `titleHTML` is built from `heb()` (escaped). Dark theme uses
  the same tokens as the main pad; forced colours keep text and borders.
- **Write 10 ordering** (`writePractice`): started soonest-due, then ready, then not ready, met words only, none when
  Off; the test matches the code.

## Fixes (coordinator, 2026-10-25)

All seven taken; each checked in Playwright at 360 px on debug links (no console errors), suite 81 JS + 50 Python.
- **C3-1:** `rotationIndex` (guide.js) keeps a card on its first place while it is new or in its first session's
  steps, then moves on one place per later review. Browser: each of the ten Meet in-verse cards was shown three
  times in one verse. A veto-able default; STATUS decision 23 says so.
- **C3-2:** `onKey` ignores `summary`. Browser: after a hint reveal, Enter on "Practice?" opens it and builds the pad.
- **C3-3:** Meet 5 new sets `moreWords` to five more than met so far and rebuilds with `newWords: 5`
  (`startSession({ newWords })`). Browser: after raising new words a day to 20, the round was Meet 10 left (5 words).
- **C3-4:** `debugView` resets `choices`, `picked`, `hints` and `sketch`.
- **C3-5:** `.practice .pad:not(.expanded)`. Browser: the expanded practice pad is at top 0, 740 high.
- **C3-6:** only known scenarios (`Object.hasOwn`) seed or switch views. Browser: `?debug=help` shows the list and
  How it works, with no toast.
- **C3-7:** `startSession({ keepDone: true })` for Meet 5 new; `total` counts `done` too.
