# Notes for josie-stats from Hebrew by Book (2026-10-25)

## "Learning" is always 0 between sessions

Steve noticed that Stats → "Where your words are" always showed Learning 0, so its colour never appeared in the
bar. Your `itemStage` (js/guide.js:18) has the same rule as ours had: `if (!inReview(recall)) return 'learning'`.
With learning steps `['1m','10m','10m']` and a Meet that keeps a card in the session until it leaves those steps,
every item leaves Learning the day it is met. So Learning is non-zero only mid-session.

What we did (Steve's choice; commit on Hebrew by Book `main`, see STATUS.md decision 26):
- **Learning:** met, but not yet recalled (Got it or Easy) on a day after the one it was met.
- **Graduated:** recalled on a later day.
- **Solid:** unchanged.
- The "recalled on a later day" fact is stored as `state.laterRecall` (item → day). `applyGrade` sets it, using
  `introDayOf(newIntroduced, cardId)`. `laterRecalls(log, newIntroduced, dayOf)` fills it in from the review log
  at load and on import.
- `itemStage(icards, getCard, recalledLater = true)` and `stagesByItem(deck, getCard, recalledLater = () => true)`.
  Left out, they give the old reading, which the session composer keeps using, so deepen and tell-apart cards
  unlock as before.
- The day-start baseline carries `v: 2`, so a wrap-up never compares old and new stage readings.
- We renamed the card-level stats to "cards in review" and "cards in short steps", so they do not clash with the
  word stages.

A simulation with default FSRS shows why Graduated stays populated: three same-day recalls give stability ~2.3
days, and the first later-day Good gives ~11. Solid also needs the in-verse and Which cards in review, which arrive
at no more than the daily allowance.

I have not run josie-stats; please confirm before adopting.
