# Hebrew by Book: status

Last updated: 2026-10-22. The board (`board.html`) is the one-stop view; this file is the narrative behind it.

## Where things are

| Item | State |
| --- | --- |
| App | First slice for Ruth built: Today (guided loop), Read, Written and read, Words, Names, Progress, How it works, Settings. Tested in Chromium at phone width. |
| Data | `data/ruth.js`, built by `python pipeline/build.py Ruth` from pinned, checksummed sources: 85 verses, 1,306 tokens, 285 vocabulary words, 30 names, 13 written/read places. |
| Tests | `python -m pytest pipeline/tests -q` (32), `node --test test/*.test.mjs` (49), `node test/board.check.mjs`, `python test/linkcheck.py` (90/90 live). |
| Review | Content review A (cited sources), content review B (independent sources, other model), fresh code review: running. |
| Publishing | Not yet pushed. Steve gave permission on 2026-10-22 for a public repo `steveandlori/hebrew-by-book` with GitHub Pages. |

## How to run it locally

```
python pipeline/fetch_sources.py      # once: downloads the pinned sources into data/sources/ (gitignored)
python pipeline/build.py Ruth         # rebuilds data/ruth.js
python scripts/serve.py               # http://127.0.0.1:8765/ with caching off
```

## Decisions taken (veto-able; say the word and they change)

1. **Glosses** come from TBESH's Gloss column, shortened to the general sense before TBESH's colon ("strength: worthy"
   → "strength"), with the BDB short definition and page shown beside every gloss (Steve chose TBESH + BDB, option C).
   TBESH's longer Meaning column is not used: TBESH says it is Online Bible material needing separate permission.
2. **Ketiv and qere** are both kept as full tokens with their own parse and dictionary word. Pointed mode leads with the
   read form and shows the written consonants in brackets (כ); unpointed mode leads with the written consonants and
   shows the read form (ק). Tags say only what differs (person, gender, number, conjugation, word, spelling).
   No wording anywhere calls either reading wrong. No verse translations anywhere (Steve: translations domesticate).
3. **Parses** are OSHB's tagging, attributed as such on the Written and read page. OSHB tags the 3:3 and 3:4 ketiv as
   1cs; that is one reading of those consonants, and the page says the written forms' parses are interpretations.
4. **Names**: OSHB decides what is a name (proper nouns and gentilics). Shaddai (1:20–21) is therefore in Names,
   though TBESH treats it as a noun "Almighty". Names are listed, not drilled.
5. **Prefixes and suffixes** (ו, ב, ל, ה, pronoun suffixes) are not drilled; they are glossed from TBESH's H9000+ rows
   and shown when you tap a word in Read.
6. **Pace**: "new words per day" (default 10) introduces that many words, each as two cards (the word, then the word in
   its verse). The same number caps new practice cards (other forms, Which word?) for words already graduated.
7. **Order**: words are introduced by the chapter where they first appear, then most frequent first, so Ruth 1 becomes
   readable first.
8. **Which word?** cards show a form in its verse and ask which of four look-alike *dictionary words* it belongs to,
   each shown with its gloss. Choosing among English glosses was unfair (e.g. "to say" vs "to speak").
9. **Scheduling**: no exam date; review gaps may grow to a year.
10. **Cantillation** is stripped everywhere; meteg too. The vowel points stay (or all marks go in unpointed mode).
11. **Font**: Noto Serif Hebrew (SIL OFL), vendored, rather than SBL Hebrew (which needs its own licence acceptance).
12. **Look**: a warm parchment palette, distinct from josie-stats' blue.

## Things found along the way

- lomed's OSHB parser (an earlier project) dropped every qere and mis-decoded participles and some stems; the parser here
  was written fresh from OSHB's code tables, and the tests pin the cases lomed got wrong. Notes: `reference/lomed/README.md`.
- TBESH has several "head" rows for 644 numbers; picking the first one turned חַיִל ("strength") into the place name
  "Helech". Fixed by letting OSHB decide name vs word.
- The OSHB qere in 3:14 carries a holam on the final vav (מַרְגְּלוֹתָיוֹ); kept as in the source.

## Banked ideas (not started)

- **Verb parsing drills** (Steve: wanted, not top priority). The parse data is already per segment.
- **Written/read as drilled cards** (currently a self-check page).
- **Hear it**: only if a licensed recording of Ruth exists; not checked yet.
- **Offline / cache-busting**: GitHub Pages caches JS for 10 minutes; lomed's content-hash service worker
  (`reference/lomed/sw.js`, `compute-cache-version.sh`) is the model.
- **How it works**: add vocabulary-specific research (spacing in L2 vocabulary; words in context vs isolation;
  the keyword method and its limits) with DOI verification. The current evidence sentences are carried over from
  josie-stats, where they were reviewed on 2026-10-20; they have not been re-reviewed here.
- **Other books**: a book picker and per-book pace (Steve: maybe 5 a day for a new book).
- **Disambiguated senses**: STEP's tagged Hebrew Bible (TAHOT) gives per-occurrence sense numbers; could sharpen
  glosses for words with several senses.
