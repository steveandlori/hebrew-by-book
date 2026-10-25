# Hebrew by Book: status

Last updated: 2026-10-23. The board (`board.html`) is the one-stop view; this file is the narrative behind it.

## Where things are

| Item | State |
| --- | --- |
| App | Ruth: Today (guided loop with Meet stars and Write the Hebrew cards), Read (English per word, look-alikes, Haktuvim audio link), Written and read, Words, Names, Progress, How it works, Settings. Tested in Chromium at phone width. |
| Data | `data/ruth.js`, built by `python pipeline/build.py Ruth` from pinned, checksummed sources plus `pipeline/overrides/ruth.json` (reviewed corrections, each citing BDB): 85 verses, 1,306 tokens, 287 vocabulary words, 30 names, 13 written/read places. |
| Tests | `python -m pytest pipeline/tests -q` (50), `node --test test/*.test.mjs` (68), `node test/board.check.mjs`, `python test/linkcheck.py` (90/90 live). CI runs all but the link check on every push. |
| Review | Done 2026-10-22: content review A (cited sources), content review B (BDB via Sefaria, GKC; other model), fresh code review, then confirmation passes by A and B, then QA with a written plan (13 scenarios, 7-day simulation): verdict SHIP. Reports in `docs/review/`. |
| Publishing | https://github.com/steveandlori/hebrew-by-book (public), Pages from `main` root: https://steveandlori.github.io/hebrew-by-book/ |

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

13. **Gloss corrections** live in `pipeline/overrides/ruth.json`, each with a reason and a BDB page; the app shows the
    original TBESH gloss beside a corrected one. Spellings BDB treats as one word are merged (יָלַךְ into הָלַךְ,
    טְרוֹם into טֶרֶם). Counts are per place: a written/read pair counts once, and so does a two-word name.
14. **3:3 and 3:4** carry a neutral note: the written ending ־תי is the usual 1cs ending and also an older 2fs
    spelling (GKC §44h); the read ending ־תְּ is 2fs. OSHB's parse of the written form (1cs) is still shown, attributed.
15. **Order of a day**: all of the day's new words first, then each in its verse (as in josie-stats).

16. **English for each word in its verse** (Steve, 2026-10-22: "default to a simple translation such as 'and she
    walked/went' ... a really abbreviated breakdown could follow"). Built by `pipeline/english.py` from the OSHB parse and
    the gloss: wayyiqtol/qatal as past, yiqtol/weqatal as "will"; 2nd person keeps gender and number ("you (f pl)"), so
    1:8's masculine "with you (pl)" shows as written; up to two senses ("went / walked"); literal word order. Each
    written/read form gets its own English (3:3 "and I will go down" / "and you (f) will go down"). Verb senses in other
    stems, participles used as nouns and per-word fixes are overrides with reasons and BDB pages. Still no verse
    translations.
17. **Look-alikes**: words with the same consonants elsewhere in the book are listed automatically under "Don't
    confuse"; words outside the book (אֵל "God" for אֶל) need a reviewed note.

18. **Two words under one number are split for learning** (Steve, 2026-10-23: "as a rule we should separate them").
    `_splits` in the overrides moves tokens by parse to a new key; so far only הִיא "she" (H1931f) out of הוּא H1931.
    The other pronouns already had separate entries (אַתָּה/אַתְּ/אַתֶּם, זֶה/זֹאת).

19. **Meet stars** (Steve, 2026-10-23): a gold star at each fifth of the clean recalls the Meet cards need (three
    each; Not yet sets a card back, as the scheduler does), banked to five, shown on the Meet chip and at wrap-up.
    First version counted finished cards, which finish together near the end, so the stars bunched (Steve noticed). A spark at every 3 right in a row on Which word?, which the app grades.
20. **Write the Hebrew** (Steve, 2026-10-23): one card per word; the word is blanked in a verse, with its English
    and part of speech as the cue; the pad is always shown. It asks for the dictionary form by default (Settings: or
    the form in the verse) and the answer shows both. It enters with form and Which word? cards (same daily cap)
    once the word has been read in place twice: in-verse and other-form views (`WRITE_READY_VIEWS`; Steve, 2026-10-23,
    replacing a 3-day wait). The card joins the current session a few cards after the second view. Settings →
    Write the Hebrew sets the number of views (1, 2, 3, 5) or Off; the default 2 may change once Steve has used it. Hints: part of speech and sound, then the
    first letter (or the dictionary form, when the verse form is asked). The Read-mode fill-in-the-blank was
    declined by Steve for now. After review 2 (`docs/review/code-2.md`, `qa-2.md`), a Write card's verse is one where
    the word occurs once and is not a written/read place; failing that, every occurrence is blanked. The three words
    found only at written/read places in Ruth (טֶרֶם 3:14, שִׂמְלָה 3:3, מוֹדַע 2:1) get no Write card, since asking for
    "the word" there would pick one reading. Hints give the sound last, because it nearly spells the answer.

21. **Listening**: each chapter in Read links to Haktuvim (Bible Society in Israel), whose chapter pages have a native
    reader's recording (Steve, 2026-10-23). Link form `https://haktuvim.co.il/study/<OSIS book>.<chapter>`, from Steve.
    Sefaria and STEP Bible stay in the word pop-ups.
22. **More after the day's work** (Steve, 2026-10-24): two buttons. "Study 10 more" is review only: the 10 cards
    already met that come due soonest (it used to slip in new words when fewer than 10 were waiting). "Learn 5 new
    words" raises today's new-word number by five (stored as `moreWords`, so it survives a reload; tomorrow is back
    to the usual number) and gives those words a Meet round of their own, with its own five stars: a finished Meet
    stays finished (`carryMeet`).
23. **A word in more than one verse** (Steve, 2026-10-24: in-verse and Write cards "seemed very repetitive, same
    verse"). Each card that shows a verse has a pool of places and takes the next at each review (`variantFor`,
    keyed on the card's review count); its id and schedule do not change. First views are as before. In-verse cards
    rotate through the spellings no "Another form" card claims, each form card through the verses with its spelling,
    Which word? through every occurrence, the recall hint verse likewise, and Write through every verse where the
    word can be blanked without giving it away. 158 of the 287 words occur more than once; the 129 that occur once
    still have only their one verse.

## Pace: what a day costs (QA's 7-day simulation, answering everything right)

Day 1 at 10 new words is about 60 card views (each new card needs three clean recalls), and by day 7 about 150 a day,
since reviews of earlier words stack up before their gaps grow. If that is too much, 5 new words a day roughly halves it
(Settings). The gaps grow quickly once words are Solid, so the load peaks and then falls; the simulation stopped at day 7.

## Things found along the way

- lomed's OSHB parser (an earlier project) dropped every qere and mis-decoded participles and some stems; the parser here
  was written fresh from OSHB's code tables, and the tests pin the cases lomed got wrong. Notes: `reference/lomed/README.md`.
- TBESH has several "head" rows for 644 numbers; picking the first one turned חַיִל ("strength") into the place name
  "Helech". Fixed by letting OSHB decide name vs word.
- The OSHB qere in 3:14 carries a holam on the final vav (מַרְגְּלוֹתָיוֹ); kept as in the source. Review B judges it a
  stray mark copied from the ketiv pointing. Open question for Steve: keep, or show the conventional מַרְגְּלוֹתָיו?
- Review found that TBESH's first gloss is often a general sense where Ruth uses another (glean, sit, bear, winnow,
  nurse, grow up), and that cutting TBESH glosses at the colon lost the Ruth sense of נָחַם ("comfort").
- Not applied, on purpose: seven of review B's minor gloss suggestions that BDB on Sefaria did not confirm
  (bundle, turn, except for זוּלָה, quiet, eat one's fill, left over, shame).
- The הוּא/הִיא split (2026-10-23) left one orphan for anyone who had studied before it: the old card
  `H1931:form:08LeN` (1:3 הִיא) no longer exists, and `H1931:which` now uses 2:20 הוּא. Harmless (review 2, C2-10).
- The pad fits the ink actually written, not the surface. One consequence: a stroke added on the small pad after
  writing full screen sits, at full size, beyond the earlier writing, so the next full-screen view shrinks everything
  a little to keep it all in view.
- Names keep the lexicon's qamats qatan (נׇעֳמִי); the verse text has the plain qamats sign. Same vowel, two code points.

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
