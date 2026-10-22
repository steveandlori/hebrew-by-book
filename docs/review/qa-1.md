# QA run 1 (Playwright, faked clock via localStorage['qa-offset-ms'])

Server: scripts/serve.py 8770 (stopped at end). Vocabulary 286 words (scenario 10 checked against 286).

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | First visit | PASS | `/#today` clean lands `#method`, h1 "How it works"; `.refs li` 23; 24 `.cite a`, all have `#ref-N`; "Start today's session" (curly apostrophe) opens Today. |
| 2 | Day 1 composition | FAIL (as written) | Phase strip is only "Meet 20". But card kinds do NOT alternate recall/ctx: observed all 10 recall cards first, then ctx cards (recall first-pass sequence הָלַךְ, הָיָה, אָמַר, כִּי...). ctx cards each have exactly one `.verse .w.hl`; recall has `.lemma .heb`. |
| 3 | Hint ladder | PASS | Labels: Part of speech, In Ruth 1:1 (with `.verse`), The meaning starts with; 4th press reveals; single `[data-auto]` Next button; grading advances. |
| 4 | Grading/keyboard | PASS | Space reveals; 3 grade buttons (1 Not yet, 2 Partly, 3 Got it); key 3 grades and advances. |
| 5 | Writing pad | PASS | Mouse stroke on canvas; reveal shows `.compare img` (300px wide) with captions "Your answer" / "The meaning". |
| 6 | Seven-day sim | PASS with notes | 7 days run (offset 0..6 days). Each day `newIntroduced` has exactly 10 recall entries (7 days). Day 2 on: "Deepen 5", "Tell apart N" phases; wrap-up each day. Progress: 61% coverage (658 of 1087), 40 Graduated + 30 Solid + 216 New; sparkline shows 7 non-zero days (60, 93, 120, 133, 137, 145, 149 answered). Which-word picks used a learn-by-feedback oracle (first pick choice 1, then the marked-right one), so some wrong picks occurred. See notes N1-N3. |
| 7 | Which word? | PASS | 4 `.choice`, each `.heb` + gloss; one right; wrong pick: one `[data-result="wrong"]` + one `right`, button "Not this one, next"; right pick: "Right, next". |
| 8 | Read | PASS (minor M1) | `#read/3` 18 `.vblock`; 3:3 two `.kq` with ק and `.kq-alt` (כ + שמלתך / וירדתי); 3:4 sheet `.kqbox` Written ...1cs / Read ...2fs plus written-ending note; 3:12 `.kq-lone` (אם כ); 3:5 and 3:17 `.kq-lone` (אֵלַי ק). Unpointed: 3:3 leads with שמלתך / וירדתי, mark כ. Glosses toggle: 258 `.gl` on / 0 off; stage toggle changes `st-*` classes; Pick a verse moved to #read/2.1 and applies `.focus`; `#read/2.10` scrolls into view with `.focus` highlight. |
| 9 | Written and read | PASS | 13 `.kqitem`; each reveals Written/Read with parses and glosses; 3:3 (וירדתי) and 3:4 show the written-ending note; none of error/mistake/corrected/correction/wrong in page text (before and after reveal). |
| 10 | Words | PASS | 286 entries; "redeem" -> גָּאַל (1 result); "גאל" -> גָּאַל + גְּאֻלָּה; `#words/H559` opens `w-H559`; freq sort has אָמַר first (also first in "order"). |
| 11 | Names | PASS | Naomi, Boaz, LORD, Ruth, Orpah, Elimelech listed; ref links `#read/1.2` etc. open Read with `.focus` on v-1.2. |
| 12 | Settings | PASS | pointing/size/buttons/newPerDay persist after reload; export -> reset (confirm accepted) -> import restored cards (5 = 5) and settings; Start over removed the stored state key. |
| 13 | Layout and errors | PASS (minor M2) | scrollWidth <= innerWidth on 8 views x 390x844 and 1100x900 x light/dark (0 overflows). No console errors from the 8770 app in my runs (sim, tours, sheets). Phone screenshots (3:4 Read, Names dark): points under correct letters, ק/כ brackets readable. |

## Notes (QUESTIONABLE, not defects)
- N1 Learning repeats: a new card shown with "Got it" comes back up to 3x in one session (maxRep 3 per recall/ctx card), so one 10-word day is 60 cards, and review load grows (60 -> 149 answered/day by day 7) rather than shrinking. Brief says no card id twice in a queue; re-queue after grading is the likely cause. QUESTIONABLE.
- N2 All 10 new words reach Graduated in the same first session (wrap-up "10 graduated") while Progress text says "Graduated after three correct recalls". Consistent with the rule, but pedagogically generous.
- N3 Tell apart counts reach 14-22 per day (Deepen 5 + Tell apart 22 > N=10); probably includes due `which` reviews. QUESTIONABLE.

## Defects
- D1 SHOULD-FIX, VERIFIED (scenario 2): Day-1 order is recall block then ctx block, not alternating recall/ctx as the plan expects. Steps: clean state, Start session, step 20 cards. Expected alternating; actual 10 Word-to-meaning cards then 10 In-its-verse (with learning repeats interleaved). Either the plan or the composer is out of date.
- M1 MINOR, VERIFIED: "Pick a verse for me" highlights the verse (`.vblock.focus`) but does not move keyboard focus (activeElement stays BODY, no tabindex).
- M2 MINOR, VERIFIED: At 390px the top nav is clipped ("How it w..."); the Settings icon is not visible without horizontal scroll of the nav. Also the bottom sheet can cover the last words of a chapter while open (close first).
- M3 MINOR, VERIFIED: Names list uses U+05C7 qamats-qatan (נׇעֳמִי, עׇרְפָּה) while verse text uses plain qamats (נָעֳמִי); inconsistent spelling between views. Renders fine.
- Not a defect of this build: console log also holds one TypeError from `127.0.0.1:8765/js/app.js` (formsListHTML, line numbers not matching current app.js), a different server/older build; not reproduced on 8770 (form cards were exercised on days 2-7).

## Verdict: SHIP (no MUST-FIX); resolve D1 by deciding the intended card order.
