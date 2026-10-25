# Brief: research on breaks, backlogs and fading (2026-10-25)

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Then read STATUS.md, especially decisions 22-26,
and `LEARNING-STRATEGY-START-HERE.md` (the framework). Report file: `docs/research/breaks.md` (create
`docs/research/`). Do not change app code.

## Steve's question (his words, condensed)

What happens if I miss time? (1) I am partway through a session and cannot get back until the next day. (2) I am
away for a week. Is there something built in that triggers more review? Newly built knowledge has a half-life of
sorts, so days away should weaken a word's standing unless it is well established. At some point I will be partway
through a book's vocabulary and need to step away. The app should not assume I am at the same place when I return.

## What we already know (verify; do not take on trust)

- Scheduling uses FSRS through ts-fsrs 5.4.1 ("FSRS-6.0"), vendored as `vendor/ts-fsrs.mjs` and wrapped by
  `js/scheduler.js`. Settings: learning steps 1m/10m/10m, relearning 10m, desired retention 0.9, maximum interval 365
  days, short-term on.
- Session composition is in `js/guide.js` `composeSession`. It takes due cards, cards in learning steps, then
  `newWords` new words and an `extra` budget for deepen/tell cards. Nothing reduces new words when a backlog of overdue
  reviews exists. Due cards are shuffled.
- Word stages (`itemStage`) read the cards' FSRS state and stability, plus `state.laterRecall`. Nothing shows a word
  fading while you are away. `retrievability()` exists and feeds the Stats page's weakest-words list.

## Questions

1. **FSRS mechanics, from the vendored code** (cite line numbers in `vendor/ts-fsrs.mjs`):
   - How is a review handled when it comes long after its due date? Cover a success and a failure, and how elapsed
     time enters the stability and difficulty updates.
   - What happens to a card in learning or relearning steps that is left overnight or for a week? Same-day and
     short-term stability with `enable_short_term`.
   - What does `get_retrievability` compute (the forgetting curve and its decay in FSRS-6)?
2. **Evidence on returning after a break**, with sources. Prefer peer-reviewed work, FSRS/open-spaced-repetition
   documentation and benchmarks, and Anki's documented behaviour; label anything weaker.
   - Ordering an overdue backlog: retrievability ascending or descending, relative overdueness, due date, random. What
     is known about which retains most?
   - Holding back new items while a backlog exists, and spreading a large backlog over days. What do mature SRS tools
     do, and is there evidence?
   - Relearning "savings" (Ebbinghaus; later work): how much faster is relearning a lapsed item? Does this argue for
     a lighter catch-up than first learning?
   - Partly learned items interrupted overnight. Should they restart their steps, continue, or be treated as
     reviews?
3. **Simulation.** Use the app's own scheduler as the learner model: recall succeeds with probability R from
   `retrievability`. Write a Node script in your own temp directory (not the repo) importing `js/scheduler.js`,
   `js/guide.js` and `js/deck.js` with `data/ruth.js`. Simulate Steve's pattern: 10 new words a day with daily
   sessions, then a break of 7 days, and separately 30 days, starting on about day 10. Compare on return:
   - the size of the backlog (cards, minutes at about 8 s a card);
   - the retention lost by the end of the break;
   - over the next 14 days, under these policies:
     (a) the current behaviour;
     (b) new words paused until the backlog is below one normal day's reviews;
     (c) (b) with the backlog ordered by lowest retrievability first;
     (d) (b) with it ordered by highest retrievability first;
     (e) the backlog capped at N reviews a day.

   Report expected words recalled, daily load, and words lost (lapsed). Say plainly that the simulation measures the
   model against itself.
4. **Fading display.** Is there a defensible threshold for showing a word as "fading" (for example R below 0.8, or
   overdue by more than X% of its interval)? How do apps present it? Note that the app's stages are derived, not
   stored.

## Output

`docs/research/breaks.md`:
- a one-paragraph answer to Steve first, in plain words;
- findings per question, each claim marked VERIFIED (source read: give a DOI or URL, or a code line) or UNVERIFIED;
- the simulation's method, numbers and caveats;
- **recommendations for the app**, ranked, each with the change in `js/` terms, its default, what it costs, and what
  the evidence supports. Mark anything that is a judgement call as Steve's to veto.

Keep it readable; Steve is a scholar, not an engineer. Do not spawn subagents.
