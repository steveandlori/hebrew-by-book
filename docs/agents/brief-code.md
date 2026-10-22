# Brief: fresh code review of the first slice

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Report file: `docs/review/code-1.md`.

## Scope
Everything in the repo except `reference/` and `vendor/`: `pipeline/*.py`, `js/*.js`, `css/style.css`,
`index.html`, `test/*`, `scripts/serve.py`. `git log` shows two commits plus uncommitted work; review the current
working tree. The engine was adapted from `C:\Users\steve\claude-here\josie-stats` (its `js/` is the baseline: the
diff from that baseline is where new bugs are most likely).

## Look for
- Correctness of the session composer and its allowances (`composeSession` in guide.js; `newWordAllowance` and
  `extraAllowance` in app.js): can a day introduce more than N new words or N extra cards? Can a card be queued twice?
- Stage computation and cache invalidation (`stageCache` in app.js) after grading, import, reset.
- Ketiv/qere rendering in `verseHTML`/`kqHTML` for all four shapes (pair, written-only 3:12, read-only 3:5/3:17,
  the two pairs in one verse 3:3 and 3:14) in both pointed and unpointed modes; maqqef joins next to a ketiv/qere.
- Escaping: every interpolated string in innerHTML goes through `esc` (data comes from our build, but check anyway).
- Routing (`#read/3`, `#read/3.12`, `#words/H559`, unknown hashes), the first-visit redirect, keyboard shortcuts.
- Pipeline: segment alignment, suffix keys, kq parsing, error handling (the build must fail loudly, never guess).
- Tests that pass for the wrong reason.

You may run: `python -m pytest pipeline/tests -q`, `node --test test/*.test.mjs`, `python scripts/serve.py 8790`
(foreground would block: instead write a throwaway Node or Python script that imports the modules, or use a
headless browser if one is available to you; do not leave servers running). Report each finding with file:line,
severity, label, a reproduction, and a suggested fix. Keep it under ~200 lines.
