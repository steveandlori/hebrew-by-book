# Brief: adversarial review of the 2026-10-23 changes

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Report file: `docs/review/code-2.md`.

## Scope

Everything changed since commit `fca2f80`: run `git diff fca2f80..HEAD -- js css index.html pipeline test`. In short:
- `pipeline/build.py` `_splits`: one Strong's number split into two lexemes by parse. Used once, for H1931 → H1931f הִיא.
- `js/pad.js`: ink kept as vector paths and redrawn on resize; `snapshot()`/`restore()`.
- `js/deck.js` and `js/guide.js`: a new card kind `write` ("Write the Hebrew"). Its unlock rule is `inPlaceViews` and
  `writeAfter`. It also changes `composeSession`, `allowances` and `hintLadder`.
- `js/guide.js` Meet stars: `meetStep`, `meetStars`, `carryMeet`.
- `js/app.js`:
  - the write card's faces;
  - `queueWriteCard`, which adds a write card mid-session;
  - stars, `celebrate` and the `#announce` live region;
  - the Which word? streak;
  - settings `writeForm` and `writeAfter`, and `writeOn`;
  - the Haktuvim chapter link.
- `js/store.js`: the new settings and `meetDay`.
- `js/render.js`: the `blank` option of `verseHTML`.

Already found by josie-stats' review of the same star code and fixed here (`3675fd9`), so do not re-report:
- stars lost on a reload;
- glyphs announced to screen readers;
- forced-colors stars;
- the `CLEAN_RECALLS` test;
- the method wording.

Do check that the fixes themselves are right.

## Look for, adversarially

Try to break it. A finding needs a concrete sequence of user actions or inputs that goes wrong.
- **Allowances and caps.** Can a day introduce more new write/form/which cards than `newPerDay`, counting
  `queueWriteCard`, a reload, Study 10 more and changes to `writeAfter`? Can a card be queued twice, or be in the
  queue while it is also `session.current`?
- **Phase bookkeeping.** Check `session.counts` and `session.phaseOf` after `queueWriteCard`, after `carryMeet` and
  after `resumeOrStart`. Can the phase strip show wrong numbers, or stars that never reach 5 or reach 5 early?
- **Settings mid-session.** Change `writeAfter` (including Off) and `writeForm` mid-card: stale state, a card shown in
  the wrong mode, a hint ladder that does not match the prompt.
- **`write` cards.** Are there tokens where the blank or the English cue gives the answer away, or is wrong? Consider:
  - ketiv/qere tokens;
  - a token whose `en` contains the lemma's English verbatim;
  - multi-word names;
  - maqqef-joined tokens;
  - unpointed mode.

  Check `occ[Math.min(2, occ.length - 1)]` for words seen once.
- **`_splits`.** Can it silently mis-key a token (for example, a morph prefix that also matches other genders)? Does it
  interact correctly with `mergeInto`, the written/read pair counting, and `alike` (same consonants)?
- **The pad.** Check the eraser after a rescale, `clear()` then resize, a hint re-render while the pad is expanded, the
  dpr, and `pointerleave` while drawing.
- **Escaping.** Every new interpolation into innerHTML.

## Content check (small)

Check these three against BDB (Sefaria's BDB is fine) and GKC, and mark each VERIFIED / QUESTIONABLE / UNVERIFIED:
- the new `_notes` for H1931 and H1931f in `pipeline/overrides/ruth.json`;
- the split's gloss "she; it" and the H1931 gloss "he; it";
- the claim "In the Torah הִיא is usually written הוא and read הִיא" (cited as GKC §32l).

You may run `python -m pytest pipeline/tests -q`, `node --test test/*.test.mjs` and throwaway Node/Python scripts
that import the modules. Do not use a browser: a separate QA agent is using it now. Report each finding with
file:line, severity, label, reproduction and a suggested fix. Lead with a findings table. Keep it under about
200 lines.
