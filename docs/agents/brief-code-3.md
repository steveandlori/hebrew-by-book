# Brief: adversarial review of the 2026-10-24 evening changes

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Report file: `docs/review/code-3.md`.

## Scope

Everything changed since commit `0bae87b`: run `git diff 0bae87b..HEAD -- js css index.html test`. STATUS.md
decisions 22-25 and "Things found along the way" say what each change is for. In short:
- **Finished-day buttons** (`js/app.js`: `studyAhead`, `writeAhead`, `learnMoreWords`, `moreButtonsHTML`):
  - Review 10 is now review only; it used to add new words.
  - Write 10 serves Write the Hebrew cards only (`writePractice` in `js/guide.js`).
  - Meet 5 new raises today's new-word number (`state.moreWords`; `allowances(…, moreWords)`) and rebuilds the
    session.
  - `carryMeet` now starts a fresh round once the saved one is finished.
- **Verse rotation** (`js/deck.js`): cards carry a `pool` of places, and `variantFor(card, reps)` picks one per
  review. `nextCard` in app.js applies it. Pools hold one place per verse (`perVerse`), and `writeTargets` replaces
  the old single `writeTarget`.
- **How it works on fresh loads**: at startup a `#method` hash becomes `#today` once `introSeen` is set.
- **Practice?** (`PRACTICE_HTML`, `session.practicePad`, `createPad`'s new `titleHTML`): a second, ungraded pad on
  a revealed Write card.
- **Debug links** (`DEBUG_*`, `debugSeed`, `debugView`, `debugBanner`; `store.useScratchStorage`):
  `?debug=<scenario>` on scratch storage.

## Look for, adversarially

Try to break it. A finding needs a concrete sequence of user actions or inputs that goes wrong.
- **Allowances and caps.** Can Meet 5 new, Write 10, Review 10, a reload, or changes to new words per day (or to
  `writeAfter`) make a day introduce more than intended? Can they leave queued cards or stars wrong? Can a day that
  has already met every word misbehave?
  - Write 10 introduces unstarted write cards outside `extraAllowance`. Is that consistent with what
    `queueWriteCard` and `allowances` assume later the same day?
  - Can a card be in the queue twice, or in the queue and also be `session.current`?
- **`carryMeet`'s finished-round rule.** Check what counts as finished, and what happens to ids that were dropped
  or are still in learning. Can a reload mid-way through a Meet 5 new round lose its stars or merge two rounds?
- **Rotation.** Is `variantFor` keyed on the right reps everywhere a card is shown, including:
  - a re-queued learning card;
  - `queueWriteCard`;
  - `resumeOrStart`;
  - the hint ladder, which uses `card.token` and `hintToken`;
  - the nudge;
  - `backHTML`;
  - the `compare` target.

  Does a re-render mid-card (a hint, a settings change, Off for Write) keep the same verse, or can the verse
  change under you? Can a stale `blank` leak from one variant to another? Does every pool entry still satisfy the
  card's invariants? In particular, a Write card must never show the answer, and a form card must keep its own
  spelling. Can `inPlaceViews` or the stages be confused by reps now meaning "which verse"?
- **Startup hash rule.** Look for a redirect loop, a lost deep link, or interference with the first visit or the
  debug links.
- **Practice pad.** Check:
  - its lifecycle across re-renders, `dropPad`, and grading while it is expanded;
  - keys while it is expanded, and `onKey` with focus inside it;
  - listener leaks;
  - `titleHTML` escaping;
  - the forced-colors and dark themes.
- **Debug links.** Could a debug run ever read or write the real key? Look at:
  - the module order: `store.useScratchStorage()` runs at app.js module evaluation;
  - `import`/`export`/`reset` in Settings while debugging;
  - a debug page that navigates to the plain URL without a reload.

  Also: `history.replaceState` with the query; bad parameter values (`reps=-1`, `words=99999`, `card=` unknown, HTML in
  `debug=`); and whether the banner escapes.
- **Escaping.** Every new interpolation into innerHTML.

You may use the debug links in a browser (`docs/agents/COMMON.md`) to confirm a finding, on a port of your own
(8771 and up), and stop only your own server. Label each finding VERIFIED (reproduced: say how) or HYPOTHETICAL.
Rank by what it would cost Steve, who uses the app daily on his phone and laptop. Also list what you checked and
found sound, briefly. Do not change code; write the report only.
