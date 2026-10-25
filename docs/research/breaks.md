# Breaks, backlogs and fading: research report (2026-10-25)

## Status / next steps

Saved early on the coordinator's instruction, because the internet was going offline. The substance is complete;
what remains is polish and a few optional checks.

- **Done:** Q1, FSRS mechanics from `vendor/ts-fsrs.mjs`, with line numbers and probes. Q2, the evidence, with sources
  read. Q3, the simulation: all policies a–e (plus b′ and e2), 7- and 30-day breaks, a no-break baseline, 40 seeds,
  an interrupted-session scenario, and sensitivity runs (how often a new word is guessed right first time, an evening
  start time near UTC midnight, and due counted by day). Q4, the fading thresholds, with numbers. Recommendations ranked.
- **Partial / optional:** not re-run with a second learner model (only the app's own scheduler is used). Pyc & Rawson
  (2009) is not cited because its abstract could not be read. No browser check of the "tab left open overnight" path
  (it is read from the code only).
- **Simulation scripts (outside the repo):**
  `C:\Users\steve\AppData\Local\Temp\claude\C--Users-steve-claude-here-hebrew-by-book\3274d868-829c-42e1-a6ab-660d20814f83\scratchpad\breaks\sim.mjs`
  (main: `node sim.mjs 40`; `MODE=interrupt`, `MODE=sd`, `MODE=fade`; env `DAY_DUE=1`, `START_HOUR=18.83`,
  `P_FIRST=0.3`, `ONLY_A=1`, `LENS=7`), plus `probe.mjs` (single-card mechanics). Outputs: `out_main.txt` and
  `out_variants.txt` in the same folder.

## The answer, in plain words

Nothing in the app reacts to an absence today. When you come back, every word whose review fell due while you were
away is waiting, all at once and in random order. New words are added on top as usual. The cards still in their
short steps simply carry on. The scheduler itself handles a late review sensibly. If you still recall a word after a
long gap, it counts that as strong evidence and pushes the word further out than an on-time review would. If you have
forgotten it, the word drops back to relearning: a 10-minute step, then a short interval. So a word's standing is
weakened only when you show that you have forgotten it, on the first review back. Well-established words (stability
of weeks) barely fade in a week. Words met in the last few days fade fastest.

In the model, a week away costs about 12 of 90 words (predicted recall falls from 95% to 82%). A month costs about 22
(down to 71%). The first day back is long: about 42 minutes after a week and 59 after a month, against 22 on a normal
day. One catch-up session restores almost all of it. Fourteen days later the pre-break words are back at about 95% under every
policy tried. So the real choice is about comfort and pace, not about what you keep: pausing new words or capping
reviews makes the return days shorter, at the price of slower progress through the book. The simulation also turned
up something unrelated to breaks that matters more day to day. The app decides "due" by the minute, and you study
once a day, so a card that comes due a few minutes after your session started waits until tomorrow. Reviews
therefore run about 1.5 times later than planned. Counting a card as due for the whole day it falls due on (as Anki
does) halves the number of forgotten words in the model, at no extra time.

## 1. What the scheduler does with late reviews (vendored ts-fsrs 5.4.1, "FSRS-6.0")

The settings were checked in `js/scheduler.js`: retention 0.9, maximum interval 365, fuzz on, short-term on, learning
steps 1m/10m/10m, relearning 10m. VERIFIED. The version string is at `vendor/ts-fsrs.mjs:500` (`version="5.4.1"`) and
:514 (`FSRSVersion = v… using FSRS-6.0`). VERIFIED.

**How elapsed time is measured.** At each review, `elapsed_days` is the number of UTC calendar days since the last
review: `dateDiffInDays` (:365, defined :228–241, using `getUTC*`). VERIFIED. `get_retrievability` instead uses whole
24-hour periods (`date_diff(..., "days")`, Math.floor, :1643). VERIFIED. The two can differ by a day.

**A late review that succeeds** (Hard, Good or Easy; `reviewState` :1084–1129). R is computed from the actual elapsed
days (:1089–1093) and passed to `next_recall_stability` (:867–877):
S′ = S·(1 + e^w8·(11−D)·S^−w9·(e^{(1−R)·w10} − 1)·…). The lower R is (the later the review), the larger the gain.
VERIFIED from the code. The FSRS wiki states the same rule ("The smaller the value of R, the larger the SInc value",
FSRS v4 section) at https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm. VERIFIED.
Probe, for a word just graduated with S = 2.3 days: Good on time (2 d) gives S 11.0 and a next interval of 11 d; at
7 d late, S 21.4 (21 d); at 14 d, 28.8; at 30 d, 37.5. VERIFIED (probe.mjs).

**A late review that fails** (Again). The post-lapse stability is
`next_forget_stability` = w11·D^−w12·((S+1)^w13 − 1)·e^{(1−R)·w14} (:890–900), capped at S/e^{w17·w18} because
short-term is on (:963–972). A lower R gives a slightly *higher* post-lapse stability: forgetting after a long gap is
less damning than forgetting after a short one. Probe: S after a lapse was 0.61 (on time), 0.72 (+7 d), 0.80 (+14 d)
and 0.91 (+30 d). The card goes to Relearning (10 m step, :264, :1100) and the lapse count rises (:1101). VERIFIED.

**Difficulty ignores time.** `next_difficulty` (:838–846) depends only on the grade (ΔD = −w6·(G−3), damped,
mean-reverted). Elapsed time and R do not enter it. One Again moved D from 2.1 to 7.4 in the probe. VERIFIED.

**Cards in learning or relearning steps left overnight or for a week.** `learningState` (:1063–1081) calls
`next_ds(elapsed_days, grade)`. With short-term on, the same-day formula `next_short_term_stability` (:907–912,
S·S^−w19·e^{w17(G−3+w18)}, never below S for Hard or better) applies only when t = 0 (:961). After a night, t ≥ 1, so
the long-term formulas apply with R from the forgetting curve. The step position is kept, not restarted: Good
advances one step (:282–289), and only Again returns to step 0 (:296–299). Probe: a card after one Good (S 2.31, at
step 1) left a day, then Good, goes to S 7.3, still Learning at step 2, due 10 minutes later; one more Good graduates
it with a 7-day interval. Left 7 days, then Good: S 21.4, and a 21-day interval after the last step. Left a day, then
Again: S 0.57 and a fresh set of three steps. VERIFIED (probe.mjs).

**Side effect of UTC days (MINOR, VERIFIED in code and by probe).** A learning step that crosses 00:00 UTC (8 pm EDT,
7 pm EST, for this machine's America/New_York zone) counts as a next-day review: S jumps from 2.3 to 7.3 for that
card, so it graduates with about a 7-day interval instead of 2. In the simulation with sessions at 6:50 pm EST
(crossing UTC midnight), the aggregate effect was small (lapses 133 against 137 over 14 days). How often it affects
Steve depends on when he studies (UNVERIFIED).

**The forgetting curve** (`forgetting_curve` :685–688; `computeDecayFactor` :680–684): R(t,S) = (1 + F·t/S)^−w20,
with w20 = 0.1542 (`FSRS6_DEFAULT_DECAY`, :519, :541) and F = 0.9^(−1/w20) − 1 ≈ 0.98, so that R = 0.9 when t = S.
The interval modifier (:716–724) is exactly 1 at retention 0.9, so a card falls due when its R reaches 0.9 (fuzz
aside). VERIFIED. The wiki confirms that FSRS-6 makes the decay trainable (awesome-fsrs wiki, FSRS-6 section).
VERIFIED. The curve is a flat power law: R falls to 0.85 at 1.9 × S, to 0.80 at 3.3 × S, and to 0.70 at 9.3 × S
(computed from the vendored function). VERIFIED.

**What the app does around this (code read).**
- `composeSession` (`js/guide.js` 319–367) takes every due card, cards in steps, `newWords` new words (from
  `allowances`, 10 a day) and `extra` new deepen/tell cards. Nothing looks at the size of the backlog. Due cards are
  shuffled (`shuffleWith(recallDue)`, 361). VERIFIED.
- "Due" is `c.due <= now` at session start (`js/app.js` 88, 251). ts-fsrs sets due = review time + interval to the
  millisecond (`date_scheduler`, :115–119). So with one session a day, a card that falls due later in the day than the
  session began waits until the next day's session. VERIFIED in code; measured in §3: the actual gap averages 1.6×
  the planned interval (median 1.5×). SHOULD-FIX.
- `resumeOrStart` (`js/app.js` 949–961) rebuilds the session only when Today is navigated to on a new local day.
  Nothing listens for focus or visibility. A tab left open on a card overnight would carry on with yesterday's queue
  until Today is opened again. VERIFIED in code; not reproduced in a browser. MINOR.
- Stages (`itemStage`, `js/guide.js` 220–231) use state, stability and `laterRecall`, never R. Nothing marks fading.
  The Progress page lists the 40 lowest-R words (`js/app.js` 845–867, minimum R over the word's cards). VERIFIED.

## 2. Evidence on returning after a break

**Ordering an overdue backlog.**
- Anki manual, Review Sort Order: "Relative overdueness" "shows cards that you're more likely to have forgotten first"
  and "is generally recommended if you have a large backlog"; with FSRS its equivalent is "Ascending retrievability".
  "Due date, then random" is recommended "when you are up to date, or when you only have a small backlog".
  https://docs.ankiweb.net/deck-options.html. VERIFIED (read).
- The FSRS author's simulation (open-spaced-repetition/review-sort-order-comparison, notebook outputs read; not
  peer-reviewed) models a permanent backlog: 20,000 cards, 20 new a day, 80 reviews a day cap, retention target 0.8.
  Descending R had the highest retention at review (0.798; ascending R 0.698; random 0.646; due date 0.605).
  Ascending R left the most cards remembered at the end (15,305, against 14,164 for descending), and PSG-descending
  was the cheapest per remembered card (1.37 s). https://github.com/open-spaced-repetition/review-sort-order-comparison
  (notebook.ipynb, script.py). VERIFIED (outputs read). So "which order is best" depends on the measure.
- Expertium's summary on the Anki forum (29 Sep 2024): with unlimited reviews the order does not matter; with a daily
  limit, descending R is best for time while holding retention. Dae logged an issue to add "reverse relative
  overdueness". https://forums.ankiweb.net/t/improving-sort-orders/50081. VERIFIED (read; community source).
- No peer-reviewed study comparing backlog orders was found. UNVERIFIED that one exists.
- Our own simulation (§3) agrees for a *temporary* backlog: the order hardly matters once the backlog is cleared within
  days.

**Holding back new items and spreading a backlog.**
- Anki manual: "If you have a backlog of overdue review cards, it is recommended that you stop introducing new cards
  until you catch up with that backlog". The review limit "also applies to new cards" by default. The Maximum
  Reviews/Day limit "can save you from a heart attack when returning to Anki after taking a week off".
  https://docs.ankiweb.net/deck-options.html. VERIFIED (read). This is expert guidance, not an experiment.
- FSRS Helper (Anki add-on): "Postpone a selected number of due cards", "when you are dealing with a large number of
  reviews after taking a break", choosing cards so that "the deviation from the original review schedule is minimal".
  https://github.com/open-spaced-repetition/fsrs4anki-helper. VERIFIED (read).
- SuperMemo's "Mercy" is "the overload tool that makes it possible to spread outstanding repetitions into the future".
  https://supermemo.guru/wiki/Mercy. VERIFIED (read).
- No controlled study of pausing new items was found. UNVERIFIED.

**Relearning savings.**
- Ebbinghaus (1885; trans. 1913), ch. 7: relearning after 24 hours saved about a third of the original work (33.7%),
  after 6 days about a fourth, and after 31 days "fully one fifth".
  https://psychclassics.yorku.ca/Ebbinghaus/memory7.htm. VERIFIED (read; nonsense syllables, a single subject).
- Nelson (1978), "Savings for nonrecognized items": savings persist even for items that can no longer be recalled or
  recognised. JEP: Human Learning and Memory 4, 453–468. https://doi.org/10.1037/0278-7393.4.5.453. VERIFIED (title
  and partial abstract read).
- MacLeod (1988): relearning advantage for words and pictures neither recalled nor recognised after 1–10 weeks.
  JEP: LMC 14, 195–212. https://doi.org/10.1037/0278-7393.14.2.195. VERIFIED (abstract read).
- Rawson & Dunlosky (2011): three correct recalls in the first session, then relearning to *one* correct recall in
  each later session. "Relearning had pronounced effects on long-term retention with a relatively minimal cost in
  terms of additional practice trials". The benefit of the initial criterion "diminished as relearning increased".
  JEP: General. https://doi.org/10.1037/a0023956. VERIFIED (abstract read).
- Bahrick et al. (1993): 300 foreign-word pairs over 9 years; 13 relearning sessions at 56 days were about as good as
  26 at 14 days. Psychological Science 4, 316–321. https://doi.org/10.1111/j.1467-9280.1993.tb00571.x. VERIFIED
  (abstract read). Bahrick & Phelps (1987): Spanish vocabulary 8 years on; relearning at 30-day intervals was best.
  JEP: LMC 13, 344–349. https://doi.org/10.1037/0278-7393.13.2.344. VERIFIED (abstract read).
- Implication: a lapsed word needs a lighter catch-up than a first meeting. The app already does this: relearning is
  one 10-minute step (one correct recall), against three for a new word. The evidence supports keeping it so. A
  heavier "re-meet" after a break is not supported.

**Partly learned items interrupted overnight.**
- Mazza et al. (2016): learning in the evening, sleeping, and relearning in the morning "reduced the amount of practice
  needed by half" and gave better retention at 1 week and 6 months than the same 12-hour gap without sleep.
  Psychological Science 27, 1321–1330. https://doi.org/10.1177/0956797616659930. VERIFIED (abstract read).
- Anki: a step that crosses a day boundary "is automatically converted to days", and such cards "appear at the start of
  the day they are scheduled for … just like review cards do". https://docs.ankiweb.net/deck-options.html,
  https://docs.ankiweb.net/preferences.html. VERIFIED (read).
- FSRS (code, §1) treats the next-day recall as a real interday review and keeps the step position. Together with
  Rawson & Dunlosky, this argues for *continuing*, not restarting: the next-day recall is the stronger evidence. A
  restart would add same-day repetitions whose value the 2011 study found diminishes once relearning happens.
  Judgement, from VERIFIED sources.

**Spacing context.** Cepeda et al. (2006), a meta-analysis of 317 experiments: the best gap grows with the retention
interval. Psychological Bulletin 132, 354–380. https://doi.org/10.1037/0033-2909.132.3.354. VERIFIED (abstract read).

## 3. Simulation

**Method.** The app's own modules: `indexBook`/`buildDeck` on `data/ruth.js` (287 words), `composeSession` and
`allowances` from `js/guide.js`, and `makeScheduler`/`grade`/`retrievability` from `js/scheduler.js`.
- One session a day at noon local time, every card answered in the order `composeSession` gives. A card still in its
  steps is put back 3–5 places later, as `onGrade` does. 8 seconds a card.
- A review succeeds with probability R = `retrievability(card, now)` (grade Good), and otherwise fails (Again). A new
  card's first view succeeds with probability 0.5 (also tried at 0.3 and 0.8). Within a day R = 1, so the later steps
  always succeed.
- Ten new words a day for days 1–9, then a break of 7 or 30 days, then 14 days under each policy. 40 seeds; means
  shown.
- "A normal day's reviews" = the mean number of due cards at session start on days 5–9 = **40.7**. The cap is
  N = 1.5 × that = **61**.
- Not modelled: Write cards joining mid-session (`queueWriteCard`), hints, Partly, and links between a word's cards
  (each card is forgotten independently).
- **This measures the model against itself:** the learner forgets exactly as FSRS's default parameters predict. It
  cannot show that FSRS is right about Steve. It shows what the app's rules do *if* it is.

**Before the break.** Daily views (seed 0): 70, 104, 120, 136, 146, 146, 149, 159, 167, matching QA's 60 → 150.
90 words met. Predicted recall at the end of day 9: 85.6 of 90 (95.2%).

**On return.**

| | no break (day 10) | 7-day break (day 17) | 30-day break (day 40) |
|---|---|---|---|
| Predicted recall of the 90 words before studying | 85.6 (95.1%) | 73.7 (81.9%) | 63.5 (70.6%) |
| Backlog (cards due) | 52 | 165 | 260 (every card met) |
| Backlog at 8 s a card, first views only | 6.9 min | 22.0 min | 34.7 min |
| First day back, current behaviour (with steps and 10 new words) | 22 min | 41.5 min | 58.9 min |

**The next 14 days.** "Lost" = Again on a recall card in review. "Old words" = the 90 met before the break.

7-day break:

| Policy | Day 1 / 2 / 3 (min) | Max day | 14-day total | New words met | Recall lapses (old words) | Old words recalled at day 14 |
|---|---|---|---|---|---|---|
| (a) current | 42 / 15 / 25 | 42 | 348 min | 140 | 56.5 (28.2) | 85.3 (94.8%) |
| (b) pause new while due > 40.7 | 27 / 15 / 9 | 27 | 199 | 67 | 37.0 (26.3) | 85.4 |
| (b′) pause new while any card is ≥ 1 day overdue | 27 / 15 / 22 | 27 | 324 | 130 | 48.6 (26.3) | 85.3 |
| (c) b + cap 61, lowest R first | 11 / 10 / 10 | 18 | 174 | 55 | 36.7 (28.0) | 85.5 |
| (d) b + cap 61, highest R first | 10 / 10 / 10 | 18 | 175 | 54 | 35.4 (26.6) | 85.7 |
| (e) cap 61, random, new words continue | 24 / 24 / 24 | 24 | 331 | 140 | 49.7 (25.7) | 85.3 |
| (e2) b + cap 61, random | 10 / 10 / 10 | 18 | 175 | 55 | 34.1 (25.6) | 85.7 |
| no break, current (for reference) | 22 / 22 / 23 | 27 | 339 | 140 | 44.9 (18.9) | 85.2 |

30-day break:

| Policy | Day 1 / 2 / 3 (min) | Max day | 14-day total | New words met | Recall lapses (old words) | Old words recalled at day 14 |
|---|---|---|---|---|---|---|
| (a) current | 59 / 14 / 26 | 59 | 361 | 140 | 64.6 (37.3) | 86.0 (95.6%) |
| (b) | 45 / 14 / 9 | 45 | 220 | 70 | 50.0 (37.9) | 86.0 |
| (b′) | 45 / 14 / 23 | 45 | 339 | 130 | 63.0 (38.7) | 86.0 |
| (c) low R first | 12 / 11 / 10 | 18 | 178 | 53 | 47.7 (40.8) | 86.3 |
| (d) high R first | 9 / 10 / 11 | 18 | 175 | 51 | 45.0 (37.0) | 86.3 |
| (e) cap, new continue | 25 / 25 / 25 | 25 | 336 | 140 | 62.0 (37.1) | 85.4 |
| (e2) | 11 / 11 / 10 | 18 | 176 | 49 | 47.6 (38.8) | 86.4 |

What the numbers say:
- **What you keep barely depends on the policy.** Old words end at 94.8–96.0% under every policy. The words lost to
  the break (old-word lapses of about 26–28 after a week and 37–41 after a month, against 19 with no break) are lost
  whatever the order. The forgetting happens during the break, and the first review only reveals it. The spread
  between policies (SD across seeds about 6 lapses, so the SE of a mean is about 1) is mostly noise. Descending R had
  about 4 fewer old-word failures than ascending R after 30 days (about 2.8 SE), with the same end state. That fits the
  FSRS simulation: descending R gives a higher success rate during catch-up, not more words kept.
- **The policies trade progress for comfort.** Literal (b) flips on and off, because the normal load keeps growing as
  words are added, so it meets only about 67–70 new words in 14 days instead of 140. (b′), defined by overdue cards,
  pauses exactly one day and costs 10 words. Caps (c, d, e2) keep every day under 20 minutes but meet only about 50
  new words.
- **A cap without pausing new words never catches up.** Under (e) the backlog rose from 89 to 136 (7 d) and from 124
  to 163 (30 d) by day 14. This is the failure mode Anki warns about.
- **The return-day spike is one day long.** Under (a), day 2 is light (14–15 minutes), because everything reviewed on
  day 1 got a fresh, longer interval.

**Interrupted session** (day 5 stopped after 75 of about 142 views; `MODE=interrupt`): 24 cards were left in the queue,
but only about 4 were left in steps overnight. Day 6 was 177 views instead of 143 (about 4.5 minutes more). Recall
lapses over days 6–12 were 16.1 against 15.7, and predicted recall at day 13 was 114.0 of 120 in both. Nothing is lost
in the model. Unmet new words simply wait, and day 6 still brings its own 10.

**Sensitivity.**
- **Counting a card as due for the whole day (`DAY_DUE=1`; due if before the next session):**

  | | Recall lapses, 14 d | Lapses, all cards | Minutes |
  |---|---|---|---|
  | No break, timestamp due | 44.9 | 136.8 | 339 |
  | No break, day due | 22.6 | 69.8 | 349 |

  Predicted recall at the end of day 9 rose from 95.2% to 96.8%. The actual gap ÷ planned interval went from a mean of
  1.61 (median 1.50) to 1.00. After a 7-day break with day-due: recall lapses 30.6 against 56.5. VERIFIED (out_variants.txt).
- **First guess right at 0.3 / 0.8:** return-day recall after 7 days 79.8% / 85.1%; first day back 45.9 / 34.3 min;
  30 days: 68.2% / 74.1%, 60.6 / 56.5 min. The conclusions do not change.
- **Sessions at 6:50 pm EST (crossing UTC midnight):** results within noise of noon.

## 4. Showing a word as fading

- No research-validated threshold for "fading" was found. UNVERIFIED that one exists.
- How apps present it:
  - Duolingo's strength meters "represent the average probability that the student can … correctly recall a random
    target word", and they "continuously update and decay until the student practices". Four bars is "golden"; fewer
    "may need practice". Settles & Meeder (2016), ACL, https://doi.org/10.18653/v1/P16-1174. VERIFIED (PDF read).
  - Anki exposes R as a number and a search (`prop:r<0.9`, "cards with retrievability less than 0.9"),
    https://docs.ankiweb.net/searching.html. VERIFIED. It has no fading badge.
- Thresholds in this app's terms (FSRS-6 curve, computed):
  - R < 0.9 is simply "due". On a normal day about 10 of 90 words are below it, so it is too noisy for a badge.
  - R < 0.85 means a gap of 1.9 × stability, about 100% overdue.
  - R < 0.80 means 3.3 × stability, about 230% overdue.
  - On return after 7 days, 29 of 90 words are below 0.8 (53 below 0.85). After 30 days, 54 are below 0.8.
  - No word with stability ≥ 7 days (the Solid line) falls below 0.8 after a 7-day break. After 30 days, 0.4 of 36 do.
    That matches Steve's "weaken a word's standing unless it is well established": R already encodes it.
- Defensible choice (judgement, Steve's to veto): show "fading" when the recall card's R is below **0.80**. That is
  about three times its planned gap, the scheduler's own target minus ten points. Show it as a mark beside the stage,
  not as a fifth stage. The stages are derived, not stored, so a time-dependent flag costs nothing to compute. It must
  not feed `stageDiff` or the day-start baseline, or a wrap-up could report words "moving" just because time passed.
  Say plainly that it is a prediction: the first review back decides.

## Recommendations for the app, ranked

1. **Count a card as due for the whole day it falls due on** (SHOULD-FIX; not specific to breaks).
   - Change: in `js/app.js` `isDue` and `dueCards`, compare against the end of today (local midnight, or a 4 am
     rollover like Anki's) instead of `now`.
   - Default: on.
   - Cost: a few lines and a test.
   - Evidence: Anki's day-based due (VERIFIED). The simulation halves forgotten words at the same time cost (model
     against itself).
   - Not a judgement call, though the rollover hour is (Steve's to veto: midnight or 4 am).
2. **Pause new words on a day when overdue cards exist** (rule b′).
   - Change: in `startSession`, if any card's due is more than a day old, pass `newWords: 0, extra: 0` to
     `composeSession`, and say so on Today: "Catching up first: N reviews waiting. New words resume tomorrow."
   - Default: on. "Meet 5 new" still works as a manual override.
   - Cost: small.
   - Evidence: Anki manual (VERIFIED, expert advice). The simulation cuts the return day from 42 to 27 minutes after a
     week, at a cost of 10 words. Do *not* use "backlog below a normal day" literally: it misfires as the normal load
     grows.
   - Steve's to veto.
3. **Order the waiting backlog by lowest R first, and offer a soft stopping point** instead of a hard cap.
   - Change: in `composeSession`, sort `recallDue` by R ascending (most likely forgotten first) instead of shuffling
     when it exceeds about 1.5 normal days. After about 60 reviews, the wrap-up offers "Stop here; the rest will come
     tomorrow".
   - Default: on when the backlog exceeds 60 cards.
   - Cost: moderate; needs R in the composer (pass a function, as `getCard` is passed).
   - Evidence: the Anki manual recommends most-forgotten first. The FSRS simulation favours descending R for success
     rate and ascending for cards kept. Our simulation finds no difference in what is kept. Since an interrupted day
     leaves the rest for tomorrow, putting the likely-forgotten first means the words most at risk are seen first.
     Judgement; Steve's to veto (descending R feels kinder and gives fewer failures).
   - Note: shuffling inside the chosen set should stay, so that cards of one word are not seen back to back.
4. **A "fading" mark** for words whose recall R < 0.80.
   - Change: in Words, Read underlines and Progress, add a flag computed from `retrievability`, not a stage. Keep it
     out of `stageDiff` and `dayStart`.
   - Default: on, threshold 0.80.
   - Cost: small to moderate (CSS and a helper beside `itemStage`).
   - Evidence: Duolingo's decaying meters (VERIFIED); no validated threshold. Judgement; Steve's to veto.
5. **Rebuild the session when the day changes in an open tab** (MINOR).
   - Change: a `visibilitychange` listener that calls `resumeOrStart` when the local day has changed.
   - Cost: tiny.
   - Evidence: code reading only.
6. **Leave alone:**
   - Interrupted learning steps continue where they stopped (supported by Mazza 2016, Rawson & Dunlosky 2011, and
     Anki's behaviour).
   - Relearning stays one 10-minute step (savings literature).
   - No extra "re-meet" after a break, and no stability reduction for absence: FSRS already lowers R with time and
     rewards late successes.
   - The UTC-midnight step quirk is MINOR; fixing it would mean patching the vendored library, so note it and do not
     act.

## Sources

- ts-fsrs 5.4.1, `vendor/ts-fsrs.mjs` (MIT), line numbers as cited.
- FSRS algorithm wiki: https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
- Review-order simulation: https://github.com/open-spaced-repetition/review-sort-order-comparison ; forum:
  https://forums.ankiweb.net/t/improving-sort-orders/50081
- Anki manual: https://docs.ankiweb.net/deck-options.html , https://docs.ankiweb.net/preferences.html ,
  https://docs.ankiweb.net/searching.html
- FSRS Helper: https://github.com/open-spaced-repetition/fsrs4anki-helper ; SuperMemo Mercy:
  https://supermemo.guru/wiki/Mercy
- Ebbinghaus 1885/1913, ch. 7: https://psychclassics.yorku.ca/Ebbinghaus/memory7.htm
- Nelson 1978 https://doi.org/10.1037/0278-7393.4.5.453 ; MacLeod 1988 https://doi.org/10.1037/0278-7393.14.2.195
- Rawson & Dunlosky 2011 https://doi.org/10.1037/a0023956 ; Rawson & Dunlosky 2022 https://doi.org/10.1177/09637214221100484
- Bahrick et al. 1993 https://doi.org/10.1111/j.1467-9280.1993.tb00571.x ; Bahrick & Phelps 1987 https://doi.org/10.1037/0278-7393.13.2.344
- Mazza et al. 2016 https://doi.org/10.1177/0956797616659930 ; Cepeda et al. 2006 https://doi.org/10.1037/0033-2909.132.3.354
- Settles & Meeder 2016 https://doi.org/10.18653/v1/P16-1174
- Metadata for all DOIs was checked against Crossref and abstracts against OpenAlex, 2026-10-25. Rawson, Dunlosky &
  Sciartelli 2013 (https://doi.org/10.1007/s10648-013-9240-4) was checked by metadata only and is not relied on.
