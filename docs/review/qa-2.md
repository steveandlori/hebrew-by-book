# QA 2: the 2026-10-23 features, in a real browser

Tester: QA agent (Playwright, Chromium). Server: `python -m http.server 8772 --bind 127.0.0.1`. Date: 2026-10-23.

## Test plan (written before running)

State is seeded by writing `localStorage['hebrew-by-book-v1']` with `settings.introSeen: true` and reloading.

1. **Writing pad** (390x844, then 1280x900). Open a recall card (fresh state). Draw a fixed stroke on the small pad;
   press Write bigger; draw a fixed stroke on the full-screen pad; read the ink bounding box from the canvas pixels;
   Done; repeat expand/collapse three times. Expected: the full-screen ink bounding box is identical each time.
   Eraser: select it, erase across a stroke; expected pixels removed, `aria-pressed` toggles. Clear: canvas empty,
   `has-ink` removed. Hint while the pad holds ink: ink survives the re-render.
2. **הוּא / הִיא.** Words: search each, expect two separate entries (H1931 "he", H1931f "she"), each with a
   "Don't confuse" note. Read 1:3: tap הִיא, sheet shows "she".
3. **Meet stars.** Fresh state, newPerDay 10: 20 Meet cards. Grade all Got it, recording stars after each grade.
   Expected: stars rise at even fractions of 60 clean recalls (every 12). Reload mid-Meet: stars kept, Meet count
   unchanged. Grade Not yet after a star: star count does not drop. Wrap-up shows the stars. `#announce` reads
   "Meet: N of 5 stars". Dark mode and forced colors: stars visible (screenshots, computed colors).
4. **Which word? spark.** Seed graduated words so which cards queue; pick right 3 times: spark element + announce
   "3 right in a row"; a wrong pick then right twice: no spark.
5. **Write the Hebrew.** For writeAfter 1, 2, 3, 5: seed a graduated word whose ctx card has reps N-1, then N;
   expected write card queued only at >= N. Off: no write card. On a write card: the target word's Hebrew text is not
   in the DOM before reveal; the cue (English) is shown; hint ladder: lemma mode = POS then first letter; verse mode =
   POS then dictionary form; reveal shows both forms; unpointed mode shows consonants only; changing writeForm and
   writeAfter (Off) mid-session takes effect.
6. **Daily caps.** newPerDay 3 with many graduated words: count new form/write/which cards introduced today
   (`newIntroduced`) after the session, after "Study 10 more", and after a reload. Expected <= 3.
7. **Haktuvim link** on chapters 1-4: href `https://haktuvim.co.il/study/Ruth.N`, `target=_blank`, `rel=noopener`.
8. **Regressions.** Keyboard (space, h, 1-3, 1-4 on which), the Read sheet, Written and read, Words, Progress,
   Settings, export/import round trip, Start over; console errors collected throughout.

## Results

Chromium through Playwright, DPR 1. All values below were read from the DOM, the canvas pixels or `localStorage`.
Seeded states use ts-fsrs Review cards (state 2, due in 10 days). Console: no errors from the app in any run. The
only warnings came from my own `getImageData` probes and from haktuvim.co.il itself.

| # | Scenario | Result |
|---|----------|--------|
| 1 | Writing pad | **FAIL**: same size in full screen PASSES; ink written on the small pad after full screen is lost (F1) |
| 2 | הוּא / הִיא | PASS |
| 3 | Meet stars | PASS for stars; **FAIL** for the wrap-up after a reload (F2) |
| 4 | Which word? spark | PASS |
| 5 | Write the Hebrew | PASS for unlocks, blank, cue, hints, reveal, unpointed; **FAIL** when Off is chosen mid-session (F3); answer visible in 13 verses (F4) |
| 6 | Daily caps | PASS |
| 7 | Haktuvim link | PASS |
| 8 | Regressions | PASS |

### 1. Writing pad
- **Same size each time (PASS).** At 390x844 the small canvas is 300x150 and the full-screen one 390x729. I drew on
  the small pad, went full screen and drew there, then went full screen 6 more times. The ink box in full screen
  was `[18,18,283,433]` every time (2574 px). The small pad showed `[3,3,59,89]` every time, so nothing compounded.
  At 1280x900 (565x150 small, 1280x785 big) the box was `[28,28,973,572]` on passes 2-4. Screenshots:
  `qa2-pad-390-big1.png`, `qa2-pad-390-big4.png`, `qa2-pad-1280-big1.png`.
- **Eraser (PASS).** `aria-pressed` switches to `pen=false,eraser=true`. A swipe removed ink: 465 to 449 px on the
  small pad and 5276 to 5083 px in full screen. On the small pad the eraser is 22 x scale (about 4 px) wide.
- **Clear (PASS).** The canvas is empty (0 px) and `has-ink` is removed.
- **Hint with ink on the pad (PASS).** Ink is kept through 1, 2 and 3 hints (451 px before and after), in the small
  pad and in full screen (`qa2-pad-1280-hints.png`).
- **F1, VERIFIED, SHOULD-FIX: a stroke written on the small pad after writing in full screen does not appear in
  full screen.** Repro at 390x844: open a recall card, press Clear, press Write bigger, draw a short stroke near the
  top left, press Done, then draw a stroke across the right half of the small pad and press Write bigger again. The
  full-screen pad shows only the first stroke: its ink box is `[38,98,63,103]` before and after. Screenshots:
  `qa2-pad-390-small-after.png` (both strokes) and `qa2-pad-390-lost-stroke.png` (one stroke). Cause (`js/pad.js`
  `pos()`): on the small pad scale is about 0.2, so a point at x=200 becomes frame x of about 970, outside the 390-wide
  frame. The frame only grows when `scale === 1`. In the same state, full-screen ink shows at about 1/5 size on the
  small pad, so a learner who goes back to the small pad writes into a pad that hides their new ink when enlarged.

### 2. הוּא and הִיא (PASS)
- In Words, searching הוא gives only `w-H1931 | הוּא he; it · 6×`, and היא gives only `w-H1931f | הִיא she; it · 5×`.
  Each has its own "Don't confuse" note: "Not הִיא 'she' (yod, hireq)…" and "Not הוּא 'he' (vav, shureq)… In the Torah
  הִיא is usually written הוא and read הִיא…" (`qa2-words-hi.png`).
- In the data, all 6 H1931 tokens are he (1:1, 2:20 twice, 3:2, 3:4, 4:17) and all 5 H1931f tokens are she (1:3,
  1:6, 1:18, 2:6, 4:15). No other הוא/היא token exists.
- Tapping הִיא in Read 1:3 opens a sheet reading "הִיא **she** … 3fs … Dictionary word הִיא she; it" (`qa2-read-1-3-hi.png`).

### 3. Meet stars
- **Evenly spaced (PASS).** A fresh state at 10 a day gives 20 Meet cards, so 60 clean recalls. With every card
  graded Got it, stars arrived at steps 12, 24, 36, 48 and 60, one every 12.
- **Reload mid-Meet (PASS).** Before the reload: 2 stars, 25 steps, 20 ids, saved 2. After it: 2 stars, 25 steps,
  20 ids, still "Meet 14 left", and the current card is in Meet.
- **Not yet takes nothing back (PASS).** Six Not yets after star 3 brought the steps from 36 down to 33, and the strip
  still showed 3 stars (saved 3). After another reload it showed 3.
- **Wrap-up (PASS).** "Meet ★★★★★" with `aria-label="5 of 5 stars"` (`qa2-wrapup.png`).
- **`#announce` (PASS).** A MutationObserver logged "Meet: 1 of 5 stars", then "Meet: 2 of 5 stars", and so on.
- **Dark mode and forced colors (PASS).** Lit stars are rgb(232,169,12) in light and rgb(247,201,72) in dark. Unlit
  stars are transparent (outline only). In forced colors, lit stars are CanvasText and unlit ones are at opacity 0.3,
  in both schemes, and they are distinguishable (`qa2-stars-light/dark/forced/forced-dark.png`). The stars are small
  (about 10 px).
- **F2, VERIFIED, SHOULD-FIX: after a reload mid-session, the wrap-up undercounts.** Repro: Start over, set new words
  to 3 and Write the Hebrew to Off, and answer 6 Meet cards with Got it. Reload, finish with Got it. The wrap-up shows
  "**0 words met**, 3 graduated". The same run without the reload shows "3 words met, 3 graduated". With 10 words and a
  reload after 25 grades it showed "0 words met, 0 graduated" (`qa2-wrapup.png`, `qa2-wrapup-after-reload.png`).
  Cause: `startSession()` takes `stagesBefore` again after the reload, and it is not saved with `meetDay`.
- **QUESTIONABLE, MINOR: a reload changes the day's queue.** Before the reload the strip was "Meet 14 left". After it
  was "Meet 14, Deepen 5, Tell apart 5", 24 left. That is because words graduated minutes earlier now qualify for
  Another form and Which word? cards, which then mixed in among the remaining Meet cards. Without a reload, only Write
  the Hebrew cards join mid-session.

### 4. Which word? spark (PASS)
Seeded 12 graduated words (Write the Hebrew Off) and picked in the order R R R W R R R R R R R. A spark
(`.burst.spark`, "✦ 3 in a row") and the announcement "3 right in a row" came after picks 3 and 7, and "6 in a row" after
pick 10. Picks 1, 2, 4 (the wrong one, which showed "Not this one"), 5, 6, 8, 9 and 11 gave no spark (`qa2-spark.png`).

### 5. Write the Hebrew
- **Unlocks (PASS).** For N = 1, 2, 3 and 5 I seeded words with in-verse reps just below, at and above N, and walked
  the session. No write card appeared for any word before its seeded plus in-session views reached N. For example,
  at N=5 a word seeded with 4 got its card after 1 in-session view, and at N=3 one seeded with 2 got it after 1. With
  Off, no write cards appeared at all.
- **Blank (PASS).** In 1:15 (dictionary form), 1:8 (as in the verse) and 1:4 (unpointed), the blanked token's pointed
  form was absent from `#view.innerHTML` and its consonants from the verse text. The blank is
  `role="img" aria-label="missing word"`.
- **Cue (PASS).** The cue shows the English and part of speech ("and to preposition", "return! (f pl) verb"), and the
  pad title matches the mode.
- **Hint ladder (PASS).** Dictionary form: "Part of speech preposition, pronounced ʾel" → "It starts with א". As in the
  verse: "Part of speech verb, pronounced šûb" → "Dictionary form שׁוּב verb".
- **Reveal (PASS).** The headings are "Dictionary form" and "In Ruth 1:15", and the target box shows the form asked
  for (`qa2-write-back-lemma.png`, `qa2-write-back-verse.png`).
- **Unpointed (PASS).** No vowel points appear in the verse or the target (target נשים, dictionary form אשה)
  (`qa2-write-back-unpointed.png`).
- **Switching mid-session.** Switching to "As in the verse" applied to the next card (PASS). Switching to unpointed
  applied (PASS).
- **F3, VERIFIED, SHOULD-FIX: Off mid-session leaves the current write card in play, and it keeps coming back.**
  Repro: seed several words with Write the Hebrew cards queued (the strip shows "Deepen 8 left"), grade one, then go
  to Settings, choose Off, and go back to Today. The strip shows "Deepen 1 left" and the card is still Write the
  Hebrew (`qa2-write-off-still-shown.png`). Grading it Got it brings it back twice more, because `onGrade` re-queues
  cards still in learning without `writeOn`, and the `#wa` handler filters `session.queue` but not
  `session.current`. The help text promises "Off removes these cards, including ones already started." After a
  reload it is gone.
- **F4, VERIFIED, MINOR: the answer can be visible elsewhere in the same verse.** In 13 of 287 write cards, the
  dictionary form or the identical form appears unblanked in the verse. Examples: 1:15 asks for אֶל, and אֶל־עַמָּהּ is
  visible. 2:19 has הַיּוֹם; 2:20 has הוּא; 4:7 has וְזֹאת. In 29 cards another form of the same word is visible.
- **QUESTIONABLE: when write cards arrive.** Learning-step reps count as views, so with the default of 2, a word met
  minutes earlier gets its Write the Hebrew card in the same session (seen in the 10-word run). That follows the
  setting literally, but the comment in `js/deck.js` says "once recall is a few days stable".

### 6. Daily caps (PASS)
With new words at 3 and 15 graduated words (each eligible for form, which and write cards), `newIntroduced` after the
session held 3 recall, 3 in-verse and 3 extra cards (`H559:which`, `H559:write`, `H559:form:08Y4K`). After Study 10
more, a reload (which showed "All caught up… today's 3 new words") and a second Study 10 more, there were still 3
extra. The cap of 10 held in the 10-word run too.

### 7. Haktuvim (PASS)
Chapters 1 to 4 link to `https://haktuvim.co.il/study/Ruth.1` through `Ruth.4`, with `target=_blank rel=noopener`. The
link is correct on a verse deep link (#read/2.5 links to Ruth.2) and after the chapter nav. Clicking opened a new
page at `…/study/Ruth.3`.

### 8. Regressions (PASS)
- **Keyboard.** `h` twice gave 2 hints. Space revealed the card, then Space took the automatic Next (logged
  `1 h2`). Space then 2, 3 and 1 logged Partly, Got it and Not yet. Shortcuts still work after drawing on the pad and
  after a mouse click on the hint button. Escape closes the full-screen pad and returns focus to "Write bigger".
- **Read sheet.** In 1:8 the written/read pair shows "Written יעשה he will do / make, Qal yiqtol 3ms; Read יַעַשׂ let him
  do / make, Qal jussive 3ms", with neither labelled correct (`qa2-read-sheet-kq.png`). Close works, and the glosses
  toggle renders 325 glosses.
- **Written and read.** 13 places, and the page never calls one reading an error or a correction.
- **Words.** 287 words. The #words/H1931f deep link opens that entry. Most frequent puts H559 first. The chapter
  filter gives 110, 91, 47 and 39 words, 287 in all.
- **Other views.** Names lists 30. Progress and How it works render.
- **Settings.** Export downloaded `hebrew-by-book-progress-2026-10-23.json` (6 cards). Start over asks to confirm,
  clears storage ("Progress cleared"), and Today then shows How it works. Importing the file brought back 6 cards
  and 6 log entries ("Progress imported"). A file with `app:"other"` was refused with "That file is not a Hebrew by
  Book progress file."

## Verdict: FIX FIRST (small fixes)
Nothing breaks the app or misleads about the text. Fix first:
1. **F3.** Off for Write the Hebrew does not remove the card on screen, and it re-queues itself. The setting's own
   text promises otherwise.
2. **F1.** Ink written on the small pad after a full-screen session is invisible in full screen, which is the core
   pad promise.
3. **F2.** The wrap-up says "0 words met" after a mid-session reload.
4. **F4** (minor). The blanked word sometimes appears elsewhere in its verse.

Side effect: the Playwright export test downloaded `.playwright-mcp/hebrew-by-book-progress-2026-10-23.json`.
