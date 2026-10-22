# Hebrew by Book

Spaced-repetition vocabulary for reading the Hebrew Bible book by book, starting with Ruth. Every word is learned on
its own and in its verses, so it can be recognised when reading. The written (ketiv) and read (qere) forms are both
kept wherever they differ, and neither is presented as the correct one.

Live: https://steveandlori.github.io/hebrew-by-book/

## Sources

- Hebrew text and morphology: [Open Scriptures Hebrew Bible](https://github.com/openscriptures/morphhb)
  (lemma and morphology CC BY 4.0; the Westminster Leningrad Codex text is public domain). Credit: Open Scriptures Hebrew Bible Project.
- Definitions and BDB page references: [OpenScriptures Hebrew Lexicon](https://github.com/openscriptures/HebrewLexicon)
  (CC BY 4.0; Brown-Driver-Briggs text public domain). Credit: Open Scriptures Hebrew Bible Project.
- Glosses: TBESH, [STEPBible.org](https://github.com/STEPBible/STEPBible-Data), based on work at Tyndale House Cambridge
  (CC BY 4.0). Only the short glosses are used, shortened to their general sense; the source file is fetched at build
  time and not redistributed.
- Hebrew type: [Noto Serif Hebrew](https://github.com/notofonts/hebrew) (SIL Open Font License 1.1, `fonts/OFL.txt`).
- Scheduling: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT, `vendor/ts-fsrs.LICENSE`).

## Development

See `STATUS.md`. In short: `python pipeline/fetch_sources.py`, `python pipeline/build.py Ruth`,
`python scripts/serve.py`; tests with `python -m pytest pipeline/tests -q` and `node --test test/*.test.mjs`.
