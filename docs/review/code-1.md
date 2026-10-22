# Code review 1 (fresh reviewer), first slice, working tree of 2026-10-22

Scope: pipeline/*.py, js/*.js, css/style.css, index.html, test/*, scripts/serve.py. Source was not edited.
Throwaway harnesses lived outside the repo (a Node script that imports app.js against a stub DOM and prints rendered
verse HTML; a fuzz of composeSession over the real 1041-card deck). `node --test test/*.test.mjs`: 49 pass.
`python -m pytest pipeline/tests -q`: 32 pass. No server was started.

Summary: no MUST-FIX. Six SHOULD-FIX, several MINOR. The session composer and allowances are sound (details below).
The ketiv/qere rendering is correct for all four shapes except the maqqef at 4:6.

## SHOULD-FIX

### S1. 4:6 maqqef lands on the qere only; the join is wrong in both modes (VERIFIED)
- `pipeline/oshb.py:123` sets `tokens[-1]["j"]` when it meets the maqqef. In 4:6 (לגאול/לגאל־לי) the maqqef follows the
  variant note, so it is set on the qere token only: data has `k:לגאול` (no j), `q:לגאל` (j).
- `js/app.js:170` then uses the first-met token's `j` (the ketiv's) for the inter-word space, so there is a space after the pair.
- Reproduction (render of `#read/4`, verse 4.6, tags simplified):
  - pointed: `[לִגְאָל־]ק (כ [לגאול]) [לִי]` : maqqef inside the lead, bracketed ketiv after it, then a space before לִי.
  - unpointed: `[לגאול]כ (ק [לגאל־]) [לי]` : the lead (written) has no maqqef; the maqqef sits on the bracketed read form.
  So the learner sees the maqqef on the wrong side of the bracket, and the word is not joined to לִי in either mode.
- Fix: in the pipeline, when a maqqef follows a variant note, copy `j` onto the ketiv and all qere tokens of that place
  (and when it precedes the note, copy from the ketiv to the qere tokens). In `kqHTML`/`verseHTML`, take `joined` from
  the lead token actually rendered, and render the maqqef after the whole `.kq` group rather than inside the lead.
  Add a pipeline test (`4.6` ketiv and qere both have `j`) and a render test.

### S2. "Start over" and "Import progress" leave the old in-memory study session alive (VERIFIED by source)
- `js/app.js:770` (import) and `:774` (reset) replace `state` and call `invalidateStages()` but never touch `session`.
  `resumeOrStart` (`:795-799`) resumes whenever `session.day === todayKey()` and `session.current || session.queue.length`,
  and `renderStudy` shows the wrap-up whenever `session.done > 0`.
- Effect: after Start over, Today still shows the old queue (cards the learner just erased, plus a stale phase strip), or
  "Session done, N cards answered" with the pre-reset `stagesBefore`. Grading a stale card re-creates state for it, so the
  reset is not clean. After an import the queue was composed against the previous state (e.g. offers new words the imported
  file has already learned; they would be graded as "new" only if absent from the import).
- Fix: add a `resetSession()` (clear `session.day`, `queue`, `current`, `done`, `phaseOf`, `counts`, `stagesBefore`, `shown`)
  and call it in both handlers (and from `loadState` replacement paths generally).

### S3. Occurrence counts `n` count ketiv and qere separately, so some words are overcounted (VERIFIED)
- `pipeline/build.py:112`: `n = len(occ)` includes both the written and the read token of one place.
- Data: H8071 "mantle" n=2 but it occurs in one place (3:3); H1350a "to redeem" n=22 (21 places: 20 plain + 4:6);
  also H3381, H4772, H6213a, H7069, H7901 (one pair each) and H3045 (9 tokens, 8 places).
- Surfaces: "n× in Ruth" on the word summary (`js/app.js:233`), Words rows (`:622`), Names, the frequency sort and the introduction
  order (`js/deck.js:28`). `coverage()` (`app.js:500`) already counts each place once, so the app contradicts itself.
- Fix: store `n` as distinct places (a ketiv/qere pair with the same lexeme counts once) and keep `occ` as is; or show
  "n readings". Decide on purpose; the neutral choice is "places".

### S4. Names tab labels Ephrathah (4:11, a place) as a "person"; other labels are coarse (VERIFIED, content)
- `js/app.js:54` derives the kind from TBESH's morph (`-P` => person). H672 Ephrathah has `N:N-F-P`, so the Names list says
  "person"; in Ruth 4:11 it is the place (BDB's own definition in the lexeme row lists both the place and the woman).
  H3063 Judah and H3478 Israel are also tagged "person" although in Ruth they are land/people.
  H673 is glossed "Ephraimite" (TBESH) while the BDB definition and 1:2 say Ephrathite (content reviewers should look).
- Fix: either drop the kind label for ambiguous names, or put the kind in the (future) overrides file per lexeme; at minimum
  show "name" for `N:..-P` rows that BDB lists as both person and place.

### S5. Raw TBESH placeholders are shown to the learner in the segment lists (VERIFIED)
- Directional he and paragogic he/nun rows come through with glosses `[to]`, `[emph.?]` (H9011 x2, H9012 x3, H9013 x6 tokens;
  e.g. 2.8 תִדְבָּקִין, 4.1 סוּרָה). `segmentsHTML` (`js/app.js:176-180`) prints `l.gloss` verbatim.
- Related, QUESTIONABLE: suffixes on infinitives are glossed with the object row ("him") (`pipeline/oshb.py:54`,
  `kind = "P" if host_pos in "NA" else "O"`): בְשָׁכְבוֹ 3.4 and כַּלֹּתוֹ 3.3 show "him", but the suffix is the subject/possessor
  ("when he lay down"). The parse label ("pronominal suffix, 3ms") is right; only the gloss misleads.
- Fix: map H9011/H9012/H9013 to plain text via the overrides mechanism or a small display table ("toward", "(emphatic)");
  for `V` infinitive constructs use the possessive row (H902x) or omit the suffix gloss.

### S6. Tests do not exercise the app-level logic that the brief cares about (VERIFIED)
- `newWordAllowance` / `extraAllowance` (`js/app.js:76-83`) live in app.js and have no tests; `composeSession` tests pass
  `newWords`/`extra` by hand. The regex `/:(form|which)/` is unanchored (works today because lexeme ids are `H\d+[a-z]?`).
- `verseHTML`/`kqHTML` have no test at all, which is how S1 got through. There is no test with maqqef next to a ketiv/qere.
- Suggested: move the two allowance functions and the kq grouping into a DOM-free module (guide.js / a new render.js) and
  add tests for: the four shapes x two modes, 3:3 and 3:14 (two pairs in one verse), 4:6 maqqef, and the allowance counts.

## MINOR

- M1 `js/store.js:40-45`: a stored value of `null` (JSON "null") passes `if (raw)` and `shape(null)` throws
  (`Cannot read properties of null (reading 'settings')`), killing the app at load (VERIFIED with a stub localStorage).
  Guard: `s = (parsed && typeof parsed === 'object') ? parsed : {}`. Same for `cards` not being an object on import,
  and card entries with bad dates (`new Date(undefined)` flows into ts-fsrs) (HYPOTHETICAL).
- M2 `js/app.js:680`: `Number(null)` is 0 and `Number.isFinite(0)` is true, so when the past snapshot had `avgInterval: null`
  (no review cards that day, `guide.js:169`) the line reads "up from 0 a week ago" (VERIFIED in node).
- M3 `js/app.js:607`: `wordsUi` filters persist across navigation, so a deep link `#words/H559` (from the Read sheet) shows
  "No words match" or hides the target when a search or chapter filter is still set. Reset the filters when `param` is present.
- M4 `js/app.js:556` (`kqNote`): the Read row always uses `x.p` (pointed) even in unpointed mode; `renderKq` (`:595`) switches.
- M5 `pipeline/lexicon.py:84`: a BDB entry with no `<status p>` and no preceding `<page>` stores `None`; `build.py` only checks
  key presence (`:68`), so the build would not fail loudly (the test catches it, but only when sources are present).
  `pipeline/build.py:36-47` `kq_differences` ignores prefix segments and all but the first qere word, so a prefix-only difference
  falls to "spelling" and a multi-word qere (none in Ruth) is under-described (HYPOTHETICAL for other books).
- M6 `pipeline/tests/test_pipeline.py:74,138`: both fixtures `pytest.skip` when the sources are absent, so a clean checkout is
  green with only the decode/normalisation tests run. Make a missing-sources skip fail loudly in CI (e.g. an env flag that turns the skip into a failure).
- M7 `js/app.js:134,378,622` and elsewhere: ids (`data-tok`, `id="w-${l.id}"`, hrefs) are interpolated without `esc`. All values
  come from our build (alphanumeric), so not exploitable; `esc` everywhere else is consistent (checked every `${}` in
  innerHTML templates). `sources.json` URLs go through `esc` but are not scheme-checked.
- M8 `index.html:13-15` loads Atkinson Hyperlegible from Google Fonts (third-party request, no offline fallback beyond system-ui),
  while the Hebrew font is self-hosted and credited in Settings. Not credited/self-hosted for the Latin font.
- M9 Two vocabulary words glossed identically: H2958 and H2962 both "before" (3:14 ketiv בטרום / qere בטרם, each the only
  occurrence). Recall cards for the two have the same answer, by construction (QUESTIONABLE; honest to both readings, but
  confusing as two separate cards). Likewise H4129 "kinsman" exists only as a qere reading (covered by a test).
- M10 `js/app.js:543`: "Pick a verse for me" sets `location.hash` to the current value when it picks the focused verse
  (no `hashchange`, nothing happens). Cosmetic.
- M11 `newIntroduced`, `sessions`, and `log` entries accumulate in localStorage (`log` is capped at 5000; the per-day maps are not).

## Checked and found sound

- Composer (`guide.js:80-123`, `app.js:76-83`). Fuzz of 300 random states over the real deck (N in 3..20, extra in 0/3/10):
  no duplicate card ids in the queue; new recall cards <= N; new form+which cards <= extra; new ctx cards <= N plus the
  "left-behind" ctx cards (which by design do not use a new word). `meetFinish` and `meetPairs` are disjoint (stage != new vs == new),
  and `recallSoon` excludes due cards, so nothing is queued twice. The allowance is spent at grading time (`applyGrade:99`), so
  re-opening the app before answering does not consume it. "Study 10 more" (`studyAhead`) deliberately bypasses the cap, and
  its new recall cards still count toward today's `newWordAllowance` (so tomorrow is unaffected).
- Stage cache: invalidated in `onGrade`, on every `navigate`, import and reset; `applyGrade` has no other caller. OK (the
  per-navigate invalidation makes the cache narrow but safe). Stage logic matches the stage tests.
- Ketiv/qere shapes: pair, 3:12 written-only, 3:5/3:17 read-only, 3:3 and 3:14 (two pairs) all render correctly in pointed
  and unpointed modes (rendered HTML inspected): lead and bracketed alternate, marks כ/ק, both tokens tappable, neutral titles,
  no "error"/"correction" wording anywhere in js/ (grep). Order in the data is always ketiv then qere, so `done` handling cannot
  double-render. Only 4:6 breaks (S1).
- Routing: `#read/3`, `#read/3.12`, `#read/3.99` (no focus), `#read/abc` (chapter 1), `#words/H559`, unknown hash => Today;
  first-visit redirect to `#method` uses `replaceState`, so Back does not loop; deep links to Read skip the intro.
  Keyboard handler ignores inputs/buttons/links and modifier keys; `route` is initialised before the first `navigate()`.
- Pipeline fails loudly on: unknown morph code, text/morph count mismatch, lemma/morph mismatch, unrecognised seg/element,
  missing TBESH row, missing Lexical Index entry, missing BDB entry, unused overrides, unpaired ketiv. Source files are pinned by sha256.
