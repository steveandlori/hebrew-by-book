# Plan review: a daily review limit and no new words on a heavy day (2026-11-07)

Reviewer: Fable 5.1 (adversarial plan review, before implementation). Plan under review:
`docs/plans/review-cap-plan.md`. This file is written incrementally; sections marked *pending* were not reached
if the session dropped.

Evidence labels: **VERIFIED** = checked against code or a run of the simulation; **REASONED** = argued from the
code's structure without a run; **HYPOTHETICAL** = plausible, not checked.

## 0. Status

- [x] Plan, research §3, STATUS decision 27, breaks-plan "As built" read
- [x] Code read (guide.js, app.js, store.js)
- [x] Simulation copied and adapted
- [x] Simulation results (question 1), including Steve's added framing (total daily time; adaptive option)
- [x] Question 2 (is 18 workable at 10/day)
- [x] Question 3 (implementation risks)
- [x] Recommendation and verdict

Complete.

## 1. Simulation (question 1)

**Method.** An adapted copy of the research sim at
`C:\Users\steve\AppData\Local\Temp\claude\C--Users-steve-claude-here-hebrew-by-book\3274d868-829c-42e1-a6ab-660d20814f83\scratchpad\review-cap\sim2.mjs`
(the original is untouched). Same learner model (the app's own `composeSession`, `allowances`, scheduler; a review
succeeds with probability R; first view 0.5; 8 s a card; one session a day at noon). Changes: due is counted by the
study day (4 am to 4 am), as the app does since decision 27; a daily cap of 18 distinct review cards, most at risk
first (Which word? cards included); the four heavy rules; 14 days steady, an optional break, then 14 more days.
20 seeds; means. The deck is `buildDeck(ruth)`: recall, ctx, up to two form, write and which cards per word, so
it has the same card kinds as the app. **This measures the model against itself:** the learner forgets exactly as
FSRS's default parameters predict, and the sim cannot say whether FSRS is right about Steve. It shows what the rules
do *if* it is.

### 1a. Steady use, 28 days, no break (VERIFIED: out_new10_steady.txt, out_new5_steady.txt)

"Reviews" = distinct review cards graded that day. "Heavy" = days with 0 new words by the rule. "New words" = met
in the 14 days. "Lapses" = Again on a recall card in review (= words that had to be relearned).

**10 new words a day, cap 18**

| Rule | Days 1-14: reviews/day mean / max | heavy days | new words | Days 15-28: reviews/day | heavy days | new words | due at start, day 28 | left over at day 28 |
|---|---|---|---|---|---|---|---|---|
| current (no cap) | 46 / 76 | 0 | 140 | 87 / 103 | 0 | 140 | 89 | 0 |
| cap only, new continue | 16 / 18 | 0 | 140 | 18 / 18 | 0 | 140 | **750** | 732 (never catches up) |
| (a) due > 18 | 15 / 18 | 9.2 | 48 | 17 / 18 | 11.9 | 21 | 24 | 7 |
| (b) due > 27 | 16 / 18 | 9.0 | 50 | 18 / 18 | 11.9 | 21 | 41 | 23 |
| (c) overdue >= 18 | 16 / 18 | 7.6 | 64 | 18 / 18 | 13.3 | 7 | 53 | 35 |
| (d) overdue >= 15 | 16 / 18 | 7.8 | 62 | 18 / 18 | 13.1 | 9 | 56 | 38 |

**5 new words a day, cap 18**

| Rule | Days 1-14: reviews/day mean / max | heavy days | new words | Days 15-28: reviews/day | heavy days | new words | due at start, day 28 | left over at day 28 |
|---|---|---|---|---|---|---|---|---|
| current (no cap) | 23 / 39 | 0 | 70 | 44 / 54 | 0 | 70 | 50 | 0 |
| cap only, new continue | 15 / 18 | 0 | 70 | 18 / 18 | 0 | 70 | **296** | 278 (never catches up) |
| (a) due > 18 | 14 / 18 | 6.1 | 40 | 17 / 18 | 9.4 | 23 | 21 | 4 |
| (b) due > 27 | 15 / 18 | 4.8 | 46 | 18 / 18 | 9.6 | 22 | 32 | 14 |
| (c) overdue >= 18 | 15 / 18 | 4.7 | 47 | 18 / 18 | 9.7 | 22 | 51 | 33 |
| (d) overdue >= 15 | 15 / 18 | 4.8 | 46 | 18 / 18 | 10.0 | 20 | 44 | 26 |

Words kept: 94.5-96% of the words met before day 14 are predicted recalled at day 28 under every rule (current
95.9%); "cap only, new continue" falls to 74.6% (10/day) and 86.9% (5/day). Recall lapses per word met are similar
across rules.

**What the steady-state numbers say (VERIFIED in the model):**
1. **In the model, a cap of 18 cannot carry 10 new words a day, nor 5.** Each new word brings about five cards into
   review, so 10 words a day is about 50 review cards a day joining the pile; 5 a day is about 25. Under every heavy
   rule the second fortnight is review-only on 9-13 of 14 days at 10/day and 9-10 of 14 at 5/day, and new words
   fall to about 1.5 a day either way. The "new words per day" setting stops being the pace; the cap is.
2. **The rules differ in how the pile is held, not in what is kept.** (a) holds the pile at the cap (a few left
   over each day) and lets new words through in dribs (1-4 on some days). (b) holds it at about 1.5x the cap with
   about 20 left over. (c) and (d) act late (overdue, not due), so the pile runs up to 50-75 before they bite and
   then nearly every day is heavy; (c) at 10/day met 7 new words in a fortnight.
3. **A cap without a heavy rule is the failure the research found**: the pile grows without bound (750 due at
   10/day by day 28, 296 at 5/day) and recall of the old words falls to 75% / 87%.
4. **The sim's steady due count does not match Steve's.** Uncapped at 10/day the model has 46 due a day in the first
   fortnight (76 by day 14, 87 in the second fortnight); at 5/day, 23 then 44. Steve reports "Recall ~20" as his normal
   day at 10 words a day. The model therefore runs 2-4x heavier than his experience. Possible reasons: he has studied
   fewer consecutive days than the model's 14-28; he grades mostly Got it/Easy with few misses (the sim fails each
   review with probability 1-R and the first view half the time, and every miss adds a relearning card); and his
   Which/form/write cards may be fewer or come later than the model's. The consequence for this review: **the
   model is pessimistic about how often a heavy day fires.** If his real steady state is 20 due a day, rule (a) at
   cap 18 would still fire on most days (20 > 18), rule (b) (27) rarely, and (c)/(d) only after a missed day.
   This is the single most important calibration gap and it is checkable from his export (see R-13).

### 1b. Steve's framing: total daily time, and an adaptive option (VERIFIED: out_new10_all.txt, out_new5_all.txt; 12 seeds)

Steve (via the coordinator): "make the time-in-app achievable and practical as a habit ... once more new words were
being introduced, I slowed down and reviewing became a longer process ... coming back after a break and seeing a
mountain of review is going to be discouraging and very often unachievable." So the measure is **minutes a day (all
views: reviews, relearning repeats, Meet steps at about 6 views a word, practice cards), its steadiness (sd across
days) and its worst day**, with new words and retention as the price. 8 s a view, as in the research; Steve's own
pace may be slower (see R-13).

Policies added: **(e) cap 18 + adaptive budget B** (new words = max(0, floor((B − 1.2 × reviews chosen) / 9)),
capped at the setting; 9 views a new word = two Meet cards × 3 steps + its practice cards, 1.2 = misses come back
once); **(e0) adaptive budget B, no review cap**.

**10 new words a day** (minutes/day: mean / max / sd across days; "0-new days" of 14; new words in the fortnight;
retention = predicted recall of the pre-break words at the end)

| Policy | Steady days 1-14 | Steady days 15-28 | After 3-day break (14 d) | After 7-day break (14 d) |
|---|---|---|---|---|
| current | 20 / 25 / 3.8; 0; 140 | 26 / 29 / 1.3; 0; 140; 96% | 27 / **45** / 5.3; 0; 140; 95% | 27 / **60** / 9.3; 0; 140; 95% |
| cap 18, new continue | 16 / 18 / 2.0; 0; 140 | 17 / 18 / 0.4; 0; 140; **75%** | 17 / 18; 0; 140; **74%** | 17 / 18; 0; 140; **73%** |
| (a) due > 18 | 6.5 / 16 / **5.6**; 9.3; 47 | 4.8 / 17 / 4.9; 11.8; 23; 96% | 4.7 / 16 / 4.7; 11.9; 21; 96% | 4.6 / 16 / 4.6; 12.0; 20; 96% |
| (b) due > 27 | 7.2 / 17 / **6.1**; 8.9; 51 | 4.8 / 17 / 5.0; 11.9; 21; 95% | 4.8 / 17 / 5.0; 11.9; 21; 95% | 4.6 / 17 / 4.7; 12.2; 18; 96% |
| (c) overdue >= 18 | 8.4 / 17 / **6.4**; 7.7; 63 | 3.4 / 10 / 2.1; 13.3; 7; 95% | 4.0 / 10 / 2.7; 12.8; 12; 95% | 3.7 / 8 / 1.9; 13.2; 8; 95% |
| (d) overdue >= 15 | 8.1 / 17 / **6.3**; 7.9; 61 | 3.7 / 12 / 2.7; 13.1; 9; 95% | 4.0 / 11 / 2.8; 12.8; 12; 95% | 3.7 / 8 / 1.9; 13.1; 9; 95% |
| (e) cap 18 + budget 90 | 12.4 / 13.3 / 0.9; 0; 102 | 12.9 / 13.7 / 0.4; 0; 98; **80%** | 12.9 / 13.6; 0; 98; **80%** | 13.0 / 13.6; 0; 98; **79%** |
| (e) cap 18 + budget 120/150 | = "cap 18, new continue" (18 reviews never fill the budget) | | | |
| (e0) budget 90, no cap | 11.7 / 13.1 / **0.9**; 0; 82 | 11.6 / 12.7 / **0.5**; 0; 58; 96% | 12.1 / **16.8** / 1.4; 1; 59; 95% | 12.7 / **25.4** / 3.5; 1; 63; 96% |
| (e0) budget 120, no cap | 15.5 / 17.1 / 1.8; 0; 107 | 15.6 / 16.6 / 0.6; 0; 78; 96% | 16.2 / **22.8** / 1.9; 1; 81; 96% | 17.2 / **34.8** / 4.9; 1; 83; 96% |
| (e0) budget 150, no cap | 18.8 / 21.1 / 3.0; 0; 130 | 19.7 / 20.9 / 0.6; 0; 98; 96% | 20.4 / 28.1 / 2.3; 1; 101; 96% | 21.5 / **42.7** / 5.9; 1; 105; 96% |

**5 new words a day**

| Policy | Steady days 1-14 | Steady days 15-28 | After 3-day break | After 7-day break |
|---|---|---|---|---|
| current | 10 / 12 / 1.9; 0; 70 | 13 / 15 / 0.9; 0; 70; 96% | 13 / **22** / 2.7; 0; 70; 95% | 14 / **30** / 4.8; 0; 70; 95% |
| cap 18, new continue | 9.2 / 10 / 1.4; 0; 70 | 9.9 / 10.5 / 0.3; 0; 70; **87%** | 10 / 11; 0; 70; **87%** | 10 / 11; 0; 70; **87%** |
| (a) due > 18 | 5.7 / 9.5 / **3.0**; 6.2; 39 | 4.8 / 9.6 / 3.1; 9.4; 23; 95% | 4.6 / 9.5 / 2.9; 9.8; 21; 96% | 4.5 / 9.6 / 2.8; 9.9; 20; 96% |
| (b) due > 27 | 6.6 / 9.9 / 3.1; 4.8; 46 | 4.9 / 10 / 3.2; 9.6; 22; 95% | 4.9 / 10 / 3.2; 9.8; 21; 96% | 4.8 / 9.9 / 3.1; 9.9; 20; 96% |
| (c) overdue >= 18 | 6.7 / 10 / 3.2; 4.8; 46 | 4.9 / 10 / 3.2; 9.6; 22; 95% | 4.9 / 10 / 3.2; 9.7; 22; 95% | 5.0 / 10 / 3.2; 9.3; 23; 96% |
| (d) overdue >= 15 | 6.7 / 10 / 3.2; 4.9; 45 | 4.7 / 10 / 3.1; 10.0; 20; 95% | 4.9 / 10 / 3.2; 9.7; 22; 95% | 4.9 / 10 / 3.1; 9.5; 23; 96% |
| (e) cap 18 + budget 60 | 7.9 / 8.6 / 0.9; 0; 58 | 8.4 / 9.0 / 0.3; 0; 56; **89%** | 8.5 / 9.1; 0; 56; **89%** | 8.6 / 9.3; 0; 56; **88%** |
| (e) cap 18 + budget 90/120 | = "cap 18, new continue" | | | |
| (e0) budget 60, no cap | 7.5 / 8.6 / **0.9**; 0; 52 | 7.5 / 8.4 / **0.5**; 0; 37; 96% | 7.9 / **10.5** / 0.9; 1; 39; 95% | 8.3 / **16.3** / 2.3; 1; 40; 96% |
| (e0) budget 90, no cap | 10 / 12.1 / 1.9; 0; 70 | 11.6 / 12.5 / 0.5; 0; 59; 96% | 11.7 / **15.2** / 1.1; 1; 59; 95% | 12.1 / **23.2** / 3.2; 1; 60; 96% |
| (e0) budget 120, no cap | = current at this setting (budget never binds in 28 days) | | | |

**What this says (VERIFIED in the model):**
5. **The heavy rules (a)-(d) are the least steady option by Steve's measure.** They alternate 16-17-minute review
   days with 2-5-minute days (sd 3-6 min at 10/day, 3 at 5/day), and in the second fortnight 9-13 of 14 days have no
   new words. A review-only day of 18 cards is short, but the pattern is a binary flip, not a steady habit. They
   do keep words (95-96%) and do flatten the return-day spike to 16-17 minutes.
6. **A fixed review cap combined with any rule that still lets new words in is a trap.** "Cap 18 + budget" at a
   budget of 120 (10/day) or 90 (5/day) is identical to "cap only, new continue": 18 reviews are only about 22
   views, so the budget always has room for new words, the pile grows without bound and retention falls to 73-87%.
   The research's warning holds in the new form: a review cap needs the new-word pause to be driven by the pile, not
   by the budget.
7. **A views budget with no review cap (e0) gives the steadiest days and keeps 95-96%.** At 10/day with B=120 the
   day is 15-17 minutes with sd 0.6-1.9, every day has new words (about 6-8 a day in steady state, falling as the
   pile grows), and the pace self-regulates. Its weakness is exactly Steve's complaint: the return day is uncapped
   (23 min after 3 days, 35 after 7 at 10/day; 15 / 23 at 5/day). One day only, but it is the mountain.
8. So the shape that fits all three of Steve's wishes (steady time, no mountain, new words most days) is **one
   daily budget that bounds reviews and new words together**: reviews up to about B/1.2 most at risk first, new
   words from what is left. Tested next as (f).

### 1c. (f) One daily budget (VERIFIED: out_new10_f.txt, out_new5_f.txt; 12 seeds)

(f): reviews taken up to floor(B / 1.2) most at risk first (the rest wait, most at risk first again tomorrow); new
words = min(setting, floor((B − 1.2 × reviews taken) / 9)); new practice cards likewise. No separate heavy rule:
when reviews fill the budget, new words are 0 by arithmetic.

| Setting / budget | Steady days 1-14 (min mean/max/sd; 0-new days; new words) | Steady 15-28 | After 3-day break | After 7-day break |
|---|---|---|---|---|
| 10/day, B=90 | 11.7 / 13.1 / 0.9; 0; 82 | 11.6 / 12.7 / 0.5; 0; 58; 96% | 11.7 / 12.7 / 0.6; 1.1; 57; 96% | 11.7 / **13.1** / 0.6; 2.0; 57; 96% |
| 10/day, B=120 | 15.5 / 17.1 / 1.8; 0; 107 | 15.6 / 16.6 / 0.6; 0; 78; 96% | 15.7 / 17.2 / 0.7; 1.4; 77; 96% | 15.8 / **17.1** / 0.7; 2.1; 77; 96% |
| 10/day, B=150 | 18.8 / 21.1 / 3.0; 0; 130 | 19.7 / 20.9 / 0.6; 0; 98; 96% | 19.7 / 20.9 / 0.8; 1.2; 97; 96% | 19.7 / **21.1** / 0.9; 2.0; 96; 96% |
| 5/day, B=60 | 7.5 / 8.6 / 0.9; 0; 52 | 7.5 / 8.4 / 0.5; 0; 37; 96% | 7.6 / 8.5 / 0.5; 1.3; 38; 96% | 7.6 / **8.6** / 0.5; 2.0; 38; 96% |
| 5/day, B=90 | 10.0 / 12.1 / 1.9; 0; 70 | 11.6 / 12.5 / 0.5; 0; 59; 96% | 11.4 / 12.3 / 0.6; 1.0; 58; 95% | 11.3 / **12.6** / 0.8; 2.0; 56; 96% |
| 5/day, B=120 | 10.0 / 12.4 / 1.9; 0; 70 | 13.3 / 14.8 / 0.9; 0; 70; 96% | 12.5 / 15.1 / 1.3; 1.0; 65; 95% | 12.3 / 15.8 / 1.7; 1.0; 63; 96% |

Day by day after a 7-day break, 10/day, B=120 (means): minutes 16 15 15 17 16 16 16 16 16 16 16 16 16 16; due at
start 224 158 72 25 37 55 50 43 50 49 50 50 48 52; reviews done 100 100 72 25 37 55 50 43 50 49 50 50 48 52; new
words 0 0 3 10 8 6 6 7 6 6 6 6 6 6. The pile of 224 is cleared in three days, every day is 15-17 minutes, and new
words come back by themselves on day 3. Compare rule (a), same scenario: minutes 3 3 3 3 3 6 5 3 6 7 7 2 5 9; due 92
82 71 59 50 39 33 31 28 23 22 25 22 20; new words 0 0 0 0 0 3 2 0 3 3 3 0 2 5.

**What (f) says (VERIFIED in the model):**
9. **One budget gives the steadiest day under every scenario tested**: sd 0.5-0.9 minutes once the deck is past its
   first fortnight, the worst day after a 7-day break within 0-1 minute of a normal day, 95.5-96% of the old words
   kept (the same as the current app), new words on all but the first one or two days back, and a self-set pace
   (about 5.5 new words a day at 10/day with B=120; about 4 a day at 5/day with B=90; the setting is a ceiling).
10. The price is progress: the same 14 days meet 77 words instead of 140 at 10/day with B=120. That is the honest
    trade; the (a)-(d) rules pay more (20-23 words) for a less steady day.
11. **The model's minutes are not Steve's minutes.** The sim gives 8 s a view, so 18 reviews are "3 minutes"; Steve
    says "Recall 20 ... takes a while". His per-card time (reading a verse, the pad, hints) is plainly several times
    8 s. The ranking of the policies does not depend on the seconds; the right budget number does. So the budget
    should be expressed and tuned in cards/views, with a first default derived from his real sessions (R-13), and
    be one setting he can move.

## 2. Is 18 workable at 10 new words a day? (question 2)

**In the model, no, and not at 5 either.** Ten words a day put about 50 review cards a day into the pile (each word
has recall, ctx, one or two form, write and which cards); a pile fed 50 a day and drained 18 a day is only kept
level by stopping the feed, so under every heavy rule the second fortnight is review-only on 9-13 days of 14 at
10/day and 9-10 at 5/day, and new words fall to about 1.5 a day whatever the setting says (§1a, VERIFIED). The
cap, not the setting, becomes the pace — which is what Steve said he wanted ("the limit sets his pace"), but it
arrives as a flip-flop between 17-minute review days and 3-minute days, not as a steadier habit.

Two things soften this. First, the model is 2-4x heavier than Steve's reported steady state (46-87 due a day in the
model at 10/day against his "Recall ~20"), so a heavy rule would fire less often for him than for the model; how
much less is unknown until his export is measured (R-13). Second, the plan's cap only touches reviews. On a
normal 10/day day the reviews are about 18 x 1.2 = 22 views, while Meet (10 words x 6 views) and new practice cards
(10 x 3) are about 90 — the cap limits the smallest part of the day. The research-style sim confirms it: "cap 18,
new words continue" is still 16-17 minutes a day at 10/day (current: 20-26). Steve's own observation ("once more
new words were being introduced, I slowed down and reviewing became a longer process") points at the Meet load,
which the plan leaves alone.

**Recommended default and rule:** see §4. In one line: do not ship a fixed review cap of 18 with a threshold
rule; ship one daily budget that bounds reviews and new words together, with the review share taken most at risk
first.

## 3. Implementation risks (question 3)

Severity: **blocker** (wrong behaviour Steve would meet), **major** (wrong in a common path), **minor**.

- **R-1 (blocker, VERIFIED from the plan text + `learnMoreWords`).** *Scenario:* the plan says "a cap of 0 means no
  limit" and also "`startSession` passes `reviewCap = max(0, cap − reviewed.length)`". After Steve finishes the
  day's 18 reviews, remaining cap = 0; then Meet 5 new (or a reload) calls `startSession`, the composer reads 0 as
  "no limit", and every due review left by the cap floods back into the session. *Amendment:* use `null`/`Infinity`
  for "no limit" and let 0 mean "none left"; test "remaining cap of 0 after a full day serves no more reviews".
- **R-2 (major, REASONED from `composeSession` lines 130-145).** *Scenario:* a card graded Not yet is in Relearning,
  due in 10 minutes, so `isDue` is true and it lands in `recallDue`, not `recallSoon`. The cap keeps the
  `reviewCap` lowest-R cards; a card just graded has high R, so with a tight remaining cap (after a reload mid-day,
  or Meet 5 new) the relearning card is the first to be *dropped*, and its step is left overnight — the opposite of
  the plan's "step cards are not capped". *Amendment:* exclude in-steps cards (Learning/Relearning) from the capped
  pool and always include them, as `recallSoon` already is; do not count them toward `reviewed` either (see R-3).
- **R-3 (minor, VERIFIED `onGrade` 466-471).** `dayPlan.reviewed` counts every distinct graded card in the recall
  phase that was not new, which includes relearning cards carried from yesterday (`recallSoon`). Distinct counting
  does hold up with relearning (a card failed and re-graded is one id), but step cards consume the remaining cap
  although the plan says they are not capped. *Amendment:* record only cards whose state at the grade was Review.
- **R-4 (major, REASONED).** The heavy decision must be a persisted `dayPlan` field computed once at day start
  (`todayPlan()` already does this for `overdue`). If `dailyNumber()` recomputed "due > cap" live, the day would
  stop being heavy as soon as the pile fell below the cap and new words would appear mid-session. *Amendment:*
  `dayPlan.heavy` (and `dayPlan.dueAtStart`) set in `todayPlan()`; `dailyNumber()` reads the flag.
- **R-5 (major, VERIFIED `reviewsWaiting`, `renderWrapUp`, `renderStudy`).** `reviewsWaiting()` returns 0 unless
  `stopped`, so the wrap-up cannot say "N reviews wait for later days" after a cap. And the "All caught up" screen
  (queue empty, `done === 0`, e.g. a reload after the day's 18) would say "You have met today's 10 new words and
  nothing is due yet" on a heavy day on which no word was met and reviews are waiting. *Amendment:* `reviewsWaiting`
  counts due reviews not in `dayPlan.reviewed` whenever a cap or a stop is in force; the empty-queue screen uses the
  heavy-day wording.
- **R-6 (major, REASONED; the cliff).** Under rule (a) with cap 18, 18 due at day start gives the full 10 new
  words (about 90 views) and 19 due gives none. A one-card difference flips the day between its longest and shortest
  form, and (b)-(d) only move the cliff. The budget form (f) has no cliff: new words fall one at a time as reviews
  rise. *Amendment:* adopt (f); if a threshold rule is kept anyway, prefer (b) (fires least in steady use).
- **R-7 (minor, REASONED).** Removing the "Caught up" checkpoint leaves `dayPlan.catchUp` with nothing that sets
  `caughtUp` except Meet 5 new and the ran-dry branch (C4-6), while `catchUp && !caughtUp` still gates
  `reviewsFirst`, the catch-up note and `queueWriteCard` (write unlocks would wait all day). Under (a)/(b) a day can
  be catch-up (overdue >= 15) and not heavy (due <= cap), so new words come straight after the reviews with no
  pause — fine, but say so. *Amendment:* replace `catchUp` with `heavy` as one concept: on a heavy day reviews first
  (Which cards among them), no write unlocks before they are done; delete `caughtUp`.
- **R-8 (minor, VERIFIED `checkpointDue`).** The soft stop fires only when `plan.ordered` and `reviewed >= 60`.
  If the composer sets `ordered` whenever it caps, the stop is unreachable under a cap below 60, as the plan says;
  with no limit it behaves as now. Nothing to change, but the test "soft stop still offered at no limit" belongs in
  the list.
- **R-9 (minor, VERIFIED `nextCard`, `staleDay`).** Day change: `nextCard` rebuilds at the first card after 4 am,
  `todayPlan()` makes a fresh `dayPlan` with an empty `reviewed`, so the cap resets correctly. One wrinkle, already
  accepted in review C4: a grade landing after 4 am on a card drawn before it is pushed into the *new* day's
  `reviewed` and costs one of its cap. Leave it.
- **R-10 (minor, REASONED).** Which word? cards on a normal day are in the `tell` phase and are neither counted nor
  capped. After a break the due Which cards can be dozens; on heavy days the plan already folds them in. Answer to
  the plan's question: **count and cap them on every day** (one due pool, phases kept for display), so the
  day's bound means one thing; they are quick cards, so if Steve finds the pool too tight the budget is the knob.
- **R-11 (major, VERIFIED store.js `useScratchStorage`, app.js line 78).** `?debug=…` removes the scratch key at
  every load, so under `?debug=away` a reload wipes the seeded state; the planned browser test "a reload does not
  serve 18 more" cannot be run that way. The earlier breaks check used `page.clock` and rebuilt via a route change,
  not a reload. *Amendment:* test the remaining cap with a unit test on `startSession`'s argument plus a browser
  check that navigates Today → Words → Today (which calls `startSession` again) rather than reloading; or add a
  `?debug=keep` flag.
- **R-12 (minor, VERIFIED `normalizeSettings`).** A new `reviewCap` setting needs its own validation (0 allowed,
  the listed values only); `newPerDay`'s rule rejects 0.
- **R-13 (major, calibration).** The model runs 2-4x heavier than Steve's reported day and prices a card at 8 s
  where his "Recall 20" "takes a while". Before fixing a number: from his export, compute cards in Review per word,
  due per study day over the last three weeks, and the median seconds between log entries in a session. Then set
  the default budget to about his comfortable day in views. Until then the default in §4 is a judgement.
- **R-14 (minor).** Review 10 after the cap "takes due cards first, most at risk first" — already true
  (`studyAhead`), and it should remain outside the cap/budget, as the plan says; add that `studyAhead` does not add
  to `dayPlan.reviewed` (it is mode 'ahead', so it does not today — keep it so).

## 4. Recommendation and verdict

**Verdict: do not implement the plan as written; amend it to one daily budget.** The plan's two parts — a fixed
review cap and a threshold heavy rule — are each defensible from the research, but together they produce a day
that flips between its longest and shortest form on a one-card difference (R-6), make most days review-only at 5
and 10 words in the model (§2), and still leave the Meet load, which is where Steve's time actually goes, untouched.
The same machinery (`composeSession` keeping the most-at-risk reviews, `dayPlan.reviewed`, `dailyNumber()`)
serves a budget just as well.

**The rule.** One setting, a daily budget B in views (shown to Steve as "about N minutes a day" once R-13 gives his
pace). At day start: reviews taken = min(due, floor(B / 1.2)), most at risk first; new words = min(setting,
floor((B − 1.2 × reviews taken) / 9)); new practice cards likewise (the setting stays the ceiling, as he asked).
Step cards never count or get capped (R-2/R-3). Which cards are in the pool (R-10). Meet 5 new, Review 10 and
Write 10 stay outside the budget as his way to do more by choice. The day's note when reviews fill the budget: "A
heavy review day: N reviews are waiting; today's M are the ones most at risk. New words come back as the pile goes
down. Meet 5 new is on the last screen if you want some." The wrap-up says how many wait (R-5).

**Defaults (judgement until R-13; options 60 / 90 / 120 / 150 / 200 / no limit).** B = **120 views** with
new words at 10 (in the model: 15-17 minutes a day, worst day after a week away 17, about 5-6 new words a day,
96% of old words kept). If Steve sets 5 words a day, B = 90 keeps the same shape (11-13 minutes). If he wants the
plan's "a couple fewer than 20 reviews" literally, B = 90 at 10 words gives about 28 reviews and 4 new words a day
in the model — but his real due count is lower than the model's, so start at 120 and let him move it.

**If the fixed cap is kept anyway:** rule (b) (due at day start > 1.5 x cap), cap 18 → 27, because it fires least
in steady use and still flattens the return day; fix R-1, R-2, R-4, R-5 and R-11 first; accept that at 10 words a
day most days will be review-only in the model.

**Changes to the plan's tests:** add "remaining cap 0 serves no reviews" (R-1), "a relearning card survives the
cap" (R-2), "heavy is decided once at day start" (R-4), the wrap-up/empty-screen wording (R-5), and replace the
reload test with a route-change test or a keep flag (R-11).

Sim files: `…\scratchpad\review-cap\sim2.mjs`, outputs `out_new10_steady.txt`, `out_new5_steady.txt`,
`out_new10_all.txt`, `out_new5_all.txt`, `out_new10_f.txt`, `out_new5_f.txt` (same folder).
