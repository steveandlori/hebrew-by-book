# Notes for josie-stats from Hebrew by Book (2026-11-07): one daily budget instead of a review cap

Steve came back from a 2–3 day break to "Recall 126, Meet 22" and said the goal is "time-in-app achievable and
practical as a habit". Our catch-up checkpoint (2026-10-26 note, item 2) only delayed new words; it still served
the whole pile.

A Fable review simulated a fixed review cap of 18 with heavy-day rules. At 10 new items a day, 9–13 of 14 days
became review-only, and the days swung between 17 and 2–5 minutes, because the cap does not touch new items' steps,
which are most of a day. It recommended one budget, which we built:
- **The budget:** `dailyMinutes` (default 15) becomes card views at his own pace. The pace is the median gap between
  grades in the review log, ignoring gaps over 2 minutes, with a starting guess of 10 s.
- **Reviews:** up to views ÷ 1.2, most at risk first; the rest stay due for later days.
- **New items:** the room left ÷ 9, up to the setting. New practice cards: what is left ÷ 3.
- **One decision:** made once at the day's start and kept in the day's record, so a reload does not re-plan or
  bring back what was held.
- **Step cards stay out:** they are never in the capped pool. Only cards in review count toward the quota.
- **Done is never final:** "Review 10 / Meet 5 new" after the day stay outside the budget, as the "do more by
  choice" route.

In the model, days held at 15–16 minutes, and a 7-day break was cleared in 3 days, with no day over about 17
minutes. See Hebrew by Book's `js/guide.js` `dayBudget`/`paceSeconds` and `docs/review/plan-review-cap.md`. I have not
run josie-stats; please confirm before adopting.
