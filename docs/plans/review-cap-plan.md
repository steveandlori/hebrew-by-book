# Plan: a daily review limit, and no new words on a heavy day (2026-11-07)

## Steve's report and what he agreed

- "I took a two or three day break and I come back to the app and I see 'Recall 126, Meet 22' — this is waaaay too
  many. We need to keep the daily rates lower even if review is necessary."
- A normal day for him is about 20 reviews ("Usually when I come back to the app, it reads something like 'Recall
  20'? And that takes a while").
- He would like the review count a couple lower than that.
- "If there's a lot of review, no new words should be introduced."
- Agreed in chat:
  - a daily review limit of about 18, adjustable;
  - no new words on a day that starts with more than about a day's worth of reviews waiting, with Meet 5 new as the
    override;
  - new words per day unchanged;
  - the limit sets his pace.

  Steve: "After review is over, I can always choose to review more or to introduce new words, so that gives me some
  freedom as well."

## Why it happened (STATUS decision 27)

Catch-up (15+ overdue) only moves new words behind a checkpoint, and the whole pile is still served. The soft stop at
60 is an offer, not a limit. There is no daily ceiling.

## Evidence (docs/research/breaks.md §3)

- **(e2), "pause new words + cap reviews":** every day after a 7-day break stayed under 18 minutes, with the same words
  kept as every other policy. It met fewer new words.
- **(e), "a cap with new words continuing":** never caught up.
- **The Anki manual:** stop new cards until a backlog is cleared, and use the review limit after time off.

## Changes

1. **Daily review limit**, a new setting `reviewCap`, default **18**. The options are 10 / 15 / 18 / 20 / 25 / 30 /
   40 / no limit (0).
   - It counts distinct review cards graded in the day's own session, `dayPlan.reviewed`, which already exists and
     survives reloads.
   - `startSession` passes `reviewCap = max(0, cap − reviewed.length)` to `composeSession`. The composer keeps the
     `reviewCap` most at risk (`riskOf` ascending, shuffled in blocks) and leaves the rest due, sets `ordered`, and
     the rest come on later days, most at risk first again.
   - The reviews counted are the Recall phase (due recall/ctx/form/write) plus due Which word? cards. Which word?
     cards on a heavy day are already counted with the reviews (`reviewsFirst`); on a normal day, should they count
     too? (Question for the review.)
   - Not capped: cards in their short steps (`recallSoon`), Meet cards, Review 10 and Write 10. Review 10 and Write
     10 are the way to do more by choice; Review 10 already takes the remaining due-today cards first.
   - The wrap-up says "N reviews wait for later days (today's limit is 18)" whenever due reviews remain because of
     the limit (or a stop). Its buttons, Review 10, Write 10 and Meet 5 new, stay as they are.
2. **A heavy day has no new words.** On a heavy day, `dailyNumber()` returns 0, as after a stop. So new words and new
   practice cards are 0, and Meet 5 new still adds five through `moreWords`.
   - The heavy rule is open (question 1). The candidates:
     (a) reviews waiting at the start of the day > the limit;
     (b) > 1.5 × the limit;
     (c) overdue from earlier days ≥ the limit;
     (d) the current overdue ≥ 15.
   - Today's note on a heavy day: "A heavy review day: N reviews are waiting. Today is reviews only, up to 18. New
     words come back once the pile is down. Meet 5 new is on the last screen if you want some."
   - The "Caught up" checkpoint goes, since a heavy day has no Meet cards to put behind it. The soft stop stays, for
     no limit or a limit over 60.
3. **New words per day unchanged.**

## Tests

- composeSession with `reviewCap`:
  - the lowest-R reviews are kept and the rest left out;
  - step cards are not capped;
  - a cap of 0 means no limit;
  - the remaining cap after a reload.
- `allowances` on a heavy day: 0 words, then 5 after Meet 5 new.
- Browser, with `page.clock` and `?debug=away&words=…`:
  - the strip shows Recall 18 and no Meet;
  - the wrap-up says how many wait;
  - a reload does not serve 18 more;
  - the next day is still heavy, with the rest of the pile;
  - Meet 5 new works;
  - Review 10 after the limit takes due cards first.

## Questions for the plan review

1. **The heavy rule.** Use the simulation in the research
   (`C:\Users\steve\AppData\Local\Temp\claude\C--Users-steve-claude-here-hebrew-by-book\3274d868-829c-42e1-a6ab-660d20814f83\scratchpad\breaks\sim.mjs`;
   adapt a copy in your own temp folder). Compare (a)–(d) with a limit of 18, at 5 and at 10 new words a day, for
   two weeks of steady use and then for a 3-day and a 7-day break. Report reviews per day, days with no new words,
   new words met, and words lost. Which rule keeps days near 18 reviews without starving new words in steady use?
2. Is 18 workable at 10 new words a day, or does it make most days review-only?
3. Does counting by distinct cards (not grades) hold up with relearning? Does the limit interact badly with
   `dayPlan`, the stop, the day-change checks, or `?debug=away`?

## As built (2026-11-07), after the Fable review (docs/review/plan-review-cap.md: amend; rule f)

The review's simulation found that a cap of 18 reviews made 9–13 of 14 days review-only and left the biggest part of
the day (new words' steps and practice cards) untouched. It recommended one daily budget instead. Steve chose **15
minutes a day** and **5 new words a day** ("again I can always add more").
- **`dailyMinutes`** (10 / 15 / 20 / 30 / no limit; default 15). His pace is measured from the review log: the
  median gap between grades, ignoring pauses over 2 minutes, with a starting guess of 10 s.
- **`dayBudget`, decided once at the day's start and kept in `dayPlan` (v 3):**
  - views = minutes × 60 ÷ pace;
  - reviews up to views ÷ 1.2, most at risk first, with the rest held for later days;
  - new words = the room left ÷ 9, up to the setting;
  - new practice cards = what is left ÷ 3.

  So there is no heavy-day rule and no cliff: new words drop out as reviews fill the day and come back one by one.
- **Fixes from the review:**
  - `reviewCap` uses null for no limit (R-1);
  - step cards are kept out of the capped pool (R-2);
  - only real reviews count toward the quota (R-3);
  - the plan is persisted for the day (R-4);
  - the wrap-up and finished screens say how many wait (R-5);
  - one concept, with the catch-up checkpoint removed (R-7);
  - Which word? reviews count on every day (R-10);
  - its own settings rule (R-12).
- **Calibration (R-13)** is by his own pace, not the model's 8 s.
- **New words per day:** the default is 5, and a saved 10 becomes 5 once (`settingsRev: 2`).
- **Browser check** (390 px): 120 reviews waiting gives "A review day … Today takes the 75 most at risk", Recall 75
  and no Meet. After 3 reviews and a reload, Recall shows 72. Settings shows the pace and the cards it allows.
