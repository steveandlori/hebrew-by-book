# Rules for every dispatched agent (hebrew-by-book)

- **Project:** a static vocabulary-training site for Biblical Hebrew, book by book, starting with Ruth.
  Repo: `C:\Users\steve\claude-here\hebrew-by-book`. Read `docs/agents/DESIGN.md` for what the app does and why.
- **Folder scope (Steve's rule):** you may read `C:\Users\steve\claude-here\hebrew-by-book`, `...\josie-stats` and
  `...\lomed`. Do not open other folders on this machine. The web is fine for sources.
- **You are read-only on source.** Do not edit any file under `js/`, `pipeline/`, `css/`, `data/`, `test/`,
  `index.html`. Write only your report file (named in your brief). CLI probes, throwaway scripts in your own temp area,
  and new throwaway tests are fair game. Ground every finding in evidence you actually saw.
- **Label every finding:** VERIFIED (you reproduced or saw it in a source, cite where), QUESTIONABLE (evidence points
  both ways, explain), or UNVERIFIED/HYPOTHETICAL (you suspect it but could not ground it). Give a severity:
  MUST-FIX (misleads the learner or breaks the app), SHOULD-FIX, or MINOR.
- **Environment:** Windows 11, Git Bash. Prefix node with `export PATH="/c/Program Files/nodejs:$PATH" && `.
  Python 3.14 is on PATH. Run every command in the foreground with a generous timeout. Do not use background
  commands. Do not poll. **Never spawn subagents.**
- **Values that bind the content (Steve's words):** the ketiv and qere are both important; "some qere may be
  legitimate corrections; others will be misinterpretations." The app must not take a side: never call a ketiv an
  error or a qere the correction. "Translations can domesticate the text when they don't understand it," so the app
  shows no verse translations, only word glosses from each reading's own dictionary entry and a literal English
  rendering of each word form (Steve asked for these on 2026-10-22: "and she walked/went").
- Nothing inherited counts as verified. Do not trust counts or claims in this brief; check them.

## Debug links

To check one part of the app, open it directly instead of working through a day's cards: `?debug=<scenario>`
(`fresh`, `today`, `done`, `write`, `card&card=<id>`; add `words=N`, `reps=N`, `reveal=1`, `practice=1`).
`?debug=help` lists them on the page. They run on scratch storage (`hebrew-by-book-debug`), wiped at each load, so
they never touch real progress. A yellow strip at the top marks a debug page. Note that the Playwright browser
keeps storage between runs: a plain URL on a port used before may carry an earlier run's progress.

## Testing across days and gaps

No library needed (Steve suggested fake time, 2026-10-25):
- **Unit tests:** the pure modules take time as an argument (`grade(…, at)`, `isDue`, `getCard`). For anything
  that reads the clock, Node's own `mock.timers.enable({ apis: ['Date'], now })` and `mock.timers.tick(ms)` from
  `node:test` mock `Date`. Checked on Node 24.
- **Browser:** Playwright's `page.clock` does the same. Call `page.clock.install({ time })` before the page loads,
  then `page.clock.fastForward('168:00:00')` or `page.clock.setSystemTime(…)` and reload, to see the app after a week
  away.

## Test servers

Stop only the server you started, by its PID or its task. Never kill every `python.exe` (a josie-stats QA agent did,
2026-10-23). Use a port of your own (8771 and up); a fresh port also avoids the browser running cached modules.
