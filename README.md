# Hebrew by Book

Spaced-repetition vocabulary for reading the Hebrew Bible book by book, starting with Ruth. Every word is learned on
its own and in its verses, so it can be recognised when reading. The written (ketiv) and read (qere) forms are both
kept wherever they differ, and neither is presented as the correct one.

**Live:** https://steveandlori.github.io/hebrew-by-book/ · **Progress board:** [`board.html`](board.html)
([live](https://steveandlori.github.io/hebrew-by-book/board.html)) · **Narrative status and decisions:** [`STATUS.md`](STATUS.md)

A static site with no build step and no server: plain ES modules, served by GitHub Pages. Progress is kept in the
browser (localStorage); Settings exports and imports it to move between devices.

## What it does

**Today** is a guided daily session in phases:

| Phase | Cards |
| --- | --- |
| Recall | cards that are due |
| Meet | new words (10 a day by default; Settings): the dictionary form → its meaning, then the word in its verse. Five gold stars mark the way through. |
| Deepen | other forms of a word in the book; **Write the Hebrew**: the word blanked in its verse, with its English as the cue, to be written on the pad as its dictionary form (or, in Settings, as it stands in the verse) |
| Tell apart | **Which word?**: pick the dictionary word of a form among look-alikes (graded by the app) |

Cards are self-graded after a real attempt; hints climb a ladder and a hinted answer grades itself. Scheduling is
FSRS ([ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)). A writing pad (finger, stylus or mouse, with a
full-screen mode) sits under each question. **How it works** in the app explains the method and the research behind it.

**Read** shows the book with every word tappable: the English for that form in its verse ("and she went / walked"),
a one-line breakdown, the full parse folded away, and "Don't confuse" notes for look-alike words. Words are
underlined by how well you know them. Each chapter links to [Haktuvim](https://haktuvim.co.il/study/Ruth.1), whose
chapter pages have a native reader's recording.

**Written and read** lists the 13 places in Ruth where ketiv and qere differ, each with both forms, their parses and
their English, without choosing between them. Pointed or unpointed text is a setting; unpointed mode leads with the
written consonants.

Also: **Words** (every vocabulary word with its forms, BDB reference and look-alikes), **Names** (proper names, kept
out of the daily cards), **Progress** (stages, coverage of the text, recall estimates) and **Settings**.

## Repository layout

```
index.html, css/, js/       the app (js/app.js wires the views; deck.js, guide.js, render.js, pad.js are DOM-free
                            where possible and unit-tested)
data/ruth.js                built data for Ruth (generated; do not edit by hand)
pipeline/                   Python (stdlib only) that builds data/<book>.js from pinned sources
  sources.json              source URLs, pinned commits and sha256 checksums
  overrides/ruth.json       reviewed corrections, every one with a reason and a BDB page
  english.py                the English rendering of each word in its verse
  tests/                    pytest suite for the pipeline and the built data
test/                       node:test suites for the app modules, board check, link check
board.html                  progress board (data block at the top, checked by test/board.check.mjs)
STATUS.md                   narrative status, veto-able decisions, banked ideas
docs/agents/                briefs, design notes and the work ledger
docs/review/                review reports and review packets
reference/lomed/            notes on an earlier, separate project that some sources were taken from
fonts/, vendor/             Noto Serif Hebrew and ts-fsrs, with their licences
```

## Development

Needs Python 3.10+ and Node 18+ (for tests only; the site itself needs neither).

```
python pipeline/fetch_sources.py   # once: downloads the pinned sources into data/sources/ (gitignored), checks sha256
python pipeline/build.py Ruth      # rebuilds data/ruth.js
python scripts/serve.py            # http://127.0.0.1:8765/ with caching off
```

Tests:

```
python -m pytest pipeline/tests -q   # pipeline and built data
node --test test/*.test.mjs          # app modules
node test/board.check.mjs            # board data block
python test/linkcheck.py             # every external link the app shows is live (network)
```

CI (`.github/workflows/ci.yml`) runs all but the link check on every push, and fails if `data/ruth.js` differs from
a fresh build. Pushing to `main` publishes the site.

### Changing the data

Corrections go in `pipeline/overrides/<book>.json`, never in `data/`. Each entry needs `why` and `source` (a BDB page),
and the build refuses entries without them. The file has sections for lexeme glosses, per-token glosses, verb senses by
stem, singular and plural renderings, participles used as nouns, per-token English, look-alike notes, written/read
notes, and `_splits` (one Strong's number that is two words to learn, such as הוּא "he" and הִיא "she"). The comment at
the top of `load_overrides` in `pipeline/build.py` lists them.

### Adding a book

Add it to `BOOKS` in `pipeline/build.py` and run `python pipeline/build.py <Book>`. The build fails loudly on gaps
(a lexeme without a gloss or BDB entry, an override for a key not in the book). The app does not yet have a book
picker; that is planned (see the board).

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
- Linked, not included: [Sefaria](https://www.sefaria.org/), [STEP Bible](https://www.stepbible.org/) and
  [Haktuvim](https://haktuvim.co.il/) (Bible Society in Israel) for verse and chapter pages and audio.
