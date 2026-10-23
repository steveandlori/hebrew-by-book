# Code review 2: the 2026-10-23 changes (fca2f80..0b5ba50)

Reviewer: adversarial code agent, 2026-10-23. Read-only on source. Probes:
- Throwaway Node scripts that import `data/ruth.js`, `deck.js`, `render.js`, `guide.js` and `scheduler.js`.
- A DOM-stub harness for `pad.js`.
- The old data at `fca2f80`.

Test suites at HEAD: `pytest pipeline/tests` 50 passed; `node --test test/*.test.mjs` 72 passed.

## Findings

| id | severity | label | one line |
|----|----------|-------|----------|
| C2-1 | SHOULD-FIX | VERIFIED | 27 of 287 Write cards show the same word unblanked elsewhere in the verse (2:20 הוּא, 4:7 וְזֹאת, 4:6 אוּכַל...) |
| C2-2 | SHOULD-FIX | VERIFIED | 3 Write cards blank one reading of a ketiv/qere place and leave the other reading visible; "as it stands in the verse" silently picks one reading |
| C2-3 | SHOULD-FIX | VERIFIED | Write hint ladder (dictionary-form mode) is inverted: hint 1 gives the pronunciation (≈ the answer), hint 2 only the first letter |
| C2-4 | SHOULD-FIX | VERIFIED | Pad: one stroke on the expanded pad, then Done: earlier ink shrinks to 25% and new strokes are 0.625 px hairlines |
| C2-5 | SHOULD-FIX | VERIFIED | Write the Hebrew set to Off mid-card: the current write card stays and keeps coming back (requeued in learning); progress total and the wrap-up's "next due" still count write cards |
| C2-6 | MINOR | QUESTIONABLE | A Write card unlocks within minutes of first meeting a word (reps count learning steps); the deck.js comment says "once recall is a few days stable" |
| C2-7 | MINOR | VERIFIED | Carried stars stay at 5 after Meet gains new cards on a reload (e.g. new words per day raised) |
| C2-8 | MINOR | VERIFIED | A blank on a maqqef-joined token drops the maqqef and glues the blank to the next word (30 cards) |
| C2-9 | MINOR | VERIFIED | Switching `writeForm` mid-card changes hint 2 from first letter to the whole dictionary form at the same hint count |
| C2-10 | MINOR | VERIFIED | The split orphans existing users' `H1931:form:08LeN` (1:3 הִיא) progress and moves `H1931:which` to a different token |
| C2-11 | MINOR | UNVERIFIED | `h`/space while the pad is expanded (focus on body after drawing) rebuilds the card and collapses the pad |

No new escaping holes: every new interpolation is either `esc()`/`heb()`, a constant, a number, or book data (`BOOK_DATA.book.id`).
Allowances and caps hold. `queueWriteCard` counts new non-recall/non-ctx cards in the queue plus those introduced today,
and `isNew` plus `queue.includes` stops double-queueing. It cannot collide with `session.current`, which is the
ctx/form card just graded. A reload, Study 10 more and changes to `writeAfter` all recompute from `newIntroduced`, so
none of them exceeds `newPerDay`. The `_splits` code has no defect that shows in Ruth.

## Details

### C2-1: the verse gives the answer away (deck.js:96, app.js frontHTML 'write')
- **Repro:** I scripted it over every Write card. The verse still shows another token of the same lexeme on 27 cards.
- **Identical form (the verse-form answer is printed in the verse):**
  - 2:20 הוּא/הוּא; 4:7 וְזֹאת/וְזֹאת; 1:2 וְשֵׁם ×3; 2:19 הַיּוֹם ×2;
  - 4:6 אוּכַל ×2; 2:9 הַנְּעָרִים ×2; 4:17 אֲבִי ×2;
  - 1:13 הֲלָהֵן ×2; 1:15 יְבִמְתֵּךְ ×2; 3:12 גֹאֵל/גֹּאֵל.
- **Other forms (they give away the root or the dictionary form):** 1:15 וְאֶל/אֶל, 1:12 וְגַם/גַּם, 4:4 וְנֶגֶד/נֶגֶד, 3:10 וְאִם/אִם, among others.
- **Effect:** the learner copies the word and grades it Got it, so the honesty the card exists for is lost.
- **Fix:** choose `occ[i]` from the occurrences whose verse has no other token with that `lex`, and fall back to blanking
  every token of that lex (`blank` as a Set).

### C2-2: Write cards on ketiv/qere places (deck.js occurrences + render.js kqHTML)
- **Affected cards:** three words occur only at k/q places, so `occurrences()` hands them a k/q token:
  - H2962 טֶרֶם, ketiv בטרום at 3:14;
  - H8071 שִׂמְלָה, ketiv שמלתך at 3:3;
  - H4129 מוֹדַע, qere at 2:1 (its ketiv מידע is a different lexeme).
- **Why the blank fails:** `tokHTML` blanks only the token whose id matches. `kqHTML` still renders the other reading.
  - In pointed mode, 3:14 shows the qere בְּטֶרֶם beside the blank, and 3:3 shows שִׂמְלֹתַיִךְ.
  - In unpointed mode, 3:3 shows the qere שמלתיך.
- **Values problem:** "As it stands in the verse" asks for one reading. That is the ketiv for H2962/H8071 and the qere
  for H4129, chosen arbitrarily. The other reading is shown as if it were the context. That quietly treats one reading
  as "the word", which the covenant forbids.
- **Fix:** skip Write cards for tokens with `kq`, or blank the whole k/q group and show both readings as the answer.

### C2-3: hint ladder (guide.js hintLadder 'write'; app.js:354)
- **Repro:** with `writeForm` = lemma, the first hint renders "Part of speech: pronoun, pronounced hîʾ".
- **Why it is inverted:** a transliteration spells out the consonants and vowels of the dictionary form. The second
  hint, "It starts with ה", is strictly weaker than the first.
- **Fix:** for write cards, give `pos` without `tr` first, then `firstLetter`, then `tr`. In verse mode, give
  `tr` → lemma.

### C2-4: pad rescale (pad.js:62-75, 121-127)
- **Repro (DOM-stub harness, dpr 2):**
  1. Write on a 340×150 pad: line width 2.5.
  2. Expand to 800×600 and draw one stroke; `down()` grows `frame` to 800×600.
  3. Press Done: `scale` is 0.25. The new stroke's `lineWidth` is **0.625**, and the earlier ink redraws at 25%.
- **Effect:** the compare image after reveal is just as tiny. Rotating a phone from landscape to portrait does the
  same to a smaller degree.
- **Fix:** keep each path's width in frame units, fixed when the stroke starts (`PEN_WIDTH / scale`), so new ink is
  2.5 px on screen. Also consider growing the frame only by the bounds of the ink actually written, not by the surface.
- **Checked and fine:**
  - `clear()` then resize;
  - eraser width (it scales the same way as the ink);
  - restore after a hint re-render;
  - `pointerleave` (pointer capture suppresses it while drawing).
- **Not fixed by this change:** dpr changes at the same CSS size are still ignored, because `size(true)` returns early.

### C2-5: Off mid-card (app.js:343 Settings, onGrade, renderWrapUp)
- **Repro:**
  1. Open a Write card.
  2. In Settings, choose Write the Hebrew → Off, then go back to Today.
  3. `resumeOrStart` sees `session.current` and shows the same write card.
  4. Grade it Not yet. `onGrade` splices it back into the queue, because there is no `writeOn` check. It returns 3-5
     cards later until it graduates.
- **Also:** the Off filter does not reduce `session.total`, so the progress bar stops short. `renderWrapUp`'s "Next
  cards come due…" includes write cards that will never be shown.
- **The setting's help text says** "Off removes these cards, including ones already started".
- **Fix:**
  - in the onchange, if `session.current` is a write card, call `nextCard()`;
  - subtract the removed cards from `total`;
  - check `writeOn(card)` before the requeue;
  - filter with `writeOn` in the wrap-up's `next`.

### C2-6: unlock timing (guide.js inPlaceViews; app.js onGrade → queueWriteCard; deck.js:9-10)
- **What happens:** ts-fsrs `reps` counts every review. Probe: two Got its on a new card gives reps 1, 2, still state
  Learning.
  - A brand-new word's ctx card reaches 2 views at its second grade in the same Meet. The Write card is spliced in
    3 cards later, while the word's recall is still in learning steps.
  - The phase strip shows a Deepen chip ("now") in the middle of Meet.
- **Why QUESTIONABLE:** this matches commit 72e4811 ("joins the current session") and Steve's words. It contradicts
  the deck.js header comment ("once recall is a few days stable") and the Deepen phase description ("graduated
  words"). The write card also takes a slot from the day's `extra` allowance.
- **Suggestion:** decide which rule is wanted, for example counting views on distinct days. Then fix the comment.

### C2-7: carried stars (guide.js carryMeet)
- **Repro:**
  - `carryMeet({day:'d', ids:[a:recall,a:ctx], steps:{3,3}, stars:5}, 'd', phaseOf with b:recall/b:ctx meet)` returns
    `stars: 5`, but `meetStars` computes 2.
- **In the app:**
  1. Finish Meet (5 stars).
  2. Raise new words per day from 10 to 15.
  3. Reload.
  4. Five new Meet cards appear under ★★★★★ ("Meet complete" was already announced).
- **Fix:** if `fresh` adds ids that are not in `saved.ids`, carry `min(saved.stars, computed)`. The simpler option:
  carry stars only when the id set did not grow.

### C2-8: maqqef (render.js tokHTML blank)
- **Cause:** the blank returns before the `t.j ? MAQQEF` append. `verseHTML` then sets `joined`, so the next word
  follows with no space and no maqqef.
- **Scope:** 30 of the 287 Write cards have `t.j`.
- **Fix:** emit the maqqef after the blank span (`t.j && !o.noJoin`).

### C2-9: writeForm mid-card (app.js renderStudy / hintLadder)
- **What happens:** the ladder is rebuilt from the current setting while `session.hints` is kept.
  - Take hint 2 in lemma mode (first letter).
  - Switch to "As in the verse" and return.
  - Hint 2 is now the whole dictionary form.
- **What does not happen:** the prompt and the hints always match each other.
- **Fix (optional):** fix `writeForm` on the card when it is first shown (`session.writeForm`).

### C2-10: split migration (deck/build)
- **Repro:** I rebuilt the deck on `fca2f80`'s data, and the old deck had `H1931:form:08LeN` (1:3 הִיא). That card
  no longer exists, so its progress is silently orphaned. Harmless; nothing iterates `state.cards`.
- **Changed token:** `H1931:which` keeps its id, but its token moves from 1:3 הִיא to 2:20 הוּא.
- **Fix:** none needed. Note it in STATUS.

### C2-11: keys while the pad is expanded (app.js onKey)
- **Hypothesis:** after drawing, focus may be on `<body>`, which the guard does not exclude. Pressing `h` then gives
  a hint, `captureSketch` destroys the pad, and the re-render collapses it. Space would reveal.
- **Status:** not checked in a browser, by instruction.
- **Fix:** have `onKey` ignore keys while `session.pad?.isExpanded()`.

## Checks of the josie-stats fixes (3675fd9)
- **Stars survive a reload:** `state.meetDay` holds `{day, ids, steps, stars}` and is written in `onGrade` before
  `persist()`. `carryMeet` puts saved, still-queued cards back under Meet, so a card in learning that the composer
  filed under Recall is not lost. It drops cards that were never graded and are no longer queued. `counts` is
  recomputed after the in-place change. Correct, apart from C2-7.
- **Screen readers:** the burst is `aria-hidden`, stars are `role="img"` with a label, and `#announce` is cleared, then
  set after 50 ms. Correct.
- **Forced colors:** `.stars i` uses CanvasText, and unearned stars get opacity .3. Correct.
- **`CLEAN_RECALLS` = 3:** matches `learning_steps: ['1m','10m','10m']` (scheduler.js:17). `meetStep` returns 3 on
  graduation, so an Easy (straight to Review) also completes a card.
- **Method wording:** "three clean recalls a new card needs" is accurate.

## `_splits` (pipeline/build.py:115-125, 135-164)
- **Matching:** segments store morph without the language letter (`Pp3fs`), so `startswith("Pp3f")` matches only the
  five 3fs tokens. These are 1:3, 1:6, 1:18, 2:6 and 4:15, the refs cited in the source string. H1931 keeps six 3ms
  tokens.
- **Order and pair counting:** the split runs after `mergeInto`, so merged keys are split too. Pair counting is by
  `lex`, so a Torah-style ketiv הוא (3ms) with qere הִיא (3fs) would now count as two words, which is correct.
- **`alike`:** uses the split's own `cons` (היא). There are no false same-letter links.
- **Risk in later books (HYPOTHETICAL):** demonstrative הַהִיא "that" would take the gloss "she; it". BDB gives "that"
  for the article forms; Ruth has none.

## Content check
| item | verdict | evidence |
|------|---------|----------|
| `_notes` H1931 "Not הִיא 'she' (yod, hireq). Only the middle letter differs" | VERIFIED | BDB entry הוּא (Sefaria BDB02313) has "m. הִיא f." in its headword. The page, 214, comes from the repo's OpenScriptures BDB XML (e.aw.aa). |
| `_notes` H1931f "Not הוּא 'he'… In the Torah הִיא is usually written הוא and read הִיא" | VERIFIED | GKC §32l (Wikisource): Kethîbh הוא for the feminine "except in eleven places", pointed הִוא, "Qerê perpetuum". BDB says the same (feminine written only 11× in the Pentateuch). The wording is neutral, as the covenant requires. |
| Glosses "she; it" (H1931f), "he; it" (H1931) | VERIFIED | BDB: "pron. of the 3rd ps. sing., he, she, used also (in both genders) for the neuter, it". The "that" sense is not needed in Ruth. |
| Cited as GKC §32l | VERIFIED | Paragraph letter confirmed on Wikisource. |

## Confirmation pass (2026-10-23, against 4a0b75d; fixes in 4d664d0)

I re-ran the original Node probes against HEAD. Suites: `node --test` 74 passed; `pytest pipeline/tests` 50 passed.
There was no browser, so the app.js-only fixes are confirmed by reading the code.

| id | verdict | evidence |
|----|---------|----------|
| C2-1 | FIXED | A rescan of all 284 Write cards in both pointings finds 0 cards with a same-lexeme token visible. 10 cards now carry a `blank` list (e.g. H3201 4:6, both אוּכַל blanked). |
| C2-2 | FIXED | No Write card targets a k/q token. `writeTarget` returns null for the only 3 words whose occurrences are all k/q places: H4129, H2962 and H8071, which now have no Write card (stated in the deck.js header). No `blank` list contains a k/q token in Ruth. |
| C2-3 | FIXED | `hintLadder` for write is: lemma mode pos → firstLetter → sound; verse mode pos → sound → lemma. The `pos` hint no longer carries `tr`. |
| C2-4 | FIXED | Same harness as before: write small, expand, stroke at (700,500), Done, new stroke. Line width is now 2.5 (was 0.625). Widths are stored per path in ink units, and pen ink is drawn at least 1 px wide. |
| C2-5 | FIXED (code) | The Off handler clears a current write card and takes it, and the removed queue cards, off `total`. `onGrade` requeues only `writeOn` cards. The wrap-up's `next` filters with `writeOn`. On return, `resumeOrStart` → `renderStudy` → `nextCard`. |
| C2-6 | ACCEPTED | Steve chose it. The deck.js and guide.js comments now describe `writeAfter` views. |
| C2-7 | FIXED | The probe `carryMeet(saved 5★, +2 fresh ids)` now carries 2★ (was 5). With no growth it still carries 5★. |
| C2-8 | FIXED | The blank is followed by `־` when `t.j` (regex probe on a joined token), and render.test.mjs adds a test. |
| C2-9 | FIXED (code) | `session.writeForm` is fixed in `nextCard`. Face, pad title, ladder and target all read `writeForm()`. |
| C2-10 | ACCEPTED | Noted in STATUS.md:108. |
| C2-11 | FIXED (code) | `onKey` returns while `session.pad.isExpanded()`. Escape still reaches the pad's own listener. |

### New findings from the fixes
| id | severity | label | one line |
|----|----------|-------|----------|
| C2-12 | MINOR | VERIFIED | Pad: a stroke that runs off the canvas edge (pointer capture keeps tracking it) counts in the ink extent, so the next redraw shrinks all the ink |
| C2-13 | MINOR | VERIFIED | With a `blank` list the verse shows two identical blanks, and nothing marks which one the card asks for |
| C2-14 | MINOR | VERIFIED | `carryMeet`'s growth rule can lower stars already shown (3★ → 2★), against the "a star once earned stays" comment |

**C2-12, pad.js `extent()`/`fitScale()`.**
- **Repro (stub harness):** on a 340×150 pad, draw (50,50)→(120,140), then (150,60)→(160,400), dragging past the
  bottom edge. Snapshot and restore it into a new pad, as a hint re-render does.
- **Result:** everything is redrawn at 37%. The first stroke now ends at (45,52).
- **Before this change:** off-canvas points were simply clipped.
- **Fix:** clamp the stored points to the surface at `pointermove` (`[0, cssW/scale] × [0, cssH/scale]`), or clamp
  them when computing `extent()`.

**C2-13, app.js frontHTML 'write' + deck.js `writeTarget` fallback.**
- **Affected cards:** in 6 of the 10 cards with a `blank` list, the blanked forms differ, so the two blanks call for
  different answers:
  - H8199 1:1: target הַשֹּׁפְטִים, other blank שְׁפֹט;
  - H5493 4:1: target וַיָּסַר, other blank סוּרָה;
  - H8198 2:13: target שִׁפְחֹתֶיךָ, other blank שִׁפְחָתֶךָ;
  - also H270, H5048 and H7997a.
- **Effect:** in "As in the verse" mode the learner must guess the target from the English cue alone. The difference
  can be as small as "your maidservants" vs "your maidservant".
- **Fix:** mark the target blank (e.g. class `blank target`, aria-label "the word to write") and show the others as
  plain blanks. Or choose a different target where the forms in the verse differ.

**C2-14, guide.js `carryMeet`.**
- **Probe:** saved 3★ (steps a:3, a:3, x:2 of 4 ids), plus 2 fresh ids, gives `stars: 2`.
- **Why it is only MINOR:** this happens only when Meet grows after a reload (new words per day raised), and it is
  arguably honest.
- **Fix:** update the `meetStarsNow` comment (app.js), or keep the earned stars and add the new cards to a sixth
  "bonus" round.
