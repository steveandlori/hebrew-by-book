# Hebrew by Book — start here

Written 2026-10-22 by the Claude session that built Steve's statistics flash-card app, as a springboard for the agent that
will build this project. Read this whole file before the first substantive exchange with Steve.

## What this project is

Help Steve learn and *retain* the Biblical Hebrew vocabulary of the book of Ruth, and recognise those words "in the wild",
in verses he has not drilled. He has translated Ruth before. The gap is not grammar or first exposure; it is retention and
recognition. Ruth is the first book; the design must stay general so other books can follow (Jonah, Genesis chapters, Psalms)
without rebuilding anything.

The approach is to reuse the learning engine, the process, and the review discipline from an existing project of Steve's:

**Repo to copy from:** https://github.com/steveandlori/josie-stats (public), local copy at `C:\Users\steve\claude-here\josie-stats`.
**Live example:** https://steveandlori.github.io/josie-stats/ — open it and go through a few cards before designing anything.
Read its `STATUS.md` first (state, architecture, the review covenant, banked ideas), then `docs/superpowers/specs/2026-10-20-guided-learning-loop-design.md`.

## What that repo already solved, and what to reuse verbatim

It is a static site (HTML, CSS, vanilla ES modules, no build step) hosted on GitHub Pages, with progress in the browser's
localStorage and export/import for moving between devices. These parts are content-agnostic and can be copied as files:

| File | What it is | Reuse |
| --- | --- | --- |
| `vendor/ts-fsrs.mjs` (+ LICENSE) | FSRS spaced-repetition scheduler, vendored ESM | as is |
| `js/scheduler.js` | thin FSRS wrapper: learning steps 1m/10m/10m (three correct recalls to graduate), exam-aware interval cap | as is; "exam dates" become whatever Steve's horizon is, or drop the cap |
| `js/guide.js` | pure, DOM-free session logic: formula **stages** (New → Learning → Graduated → Solid) derived from FSRS card states; the **Today composer** (phases: Recall what is due, Meet new items as a pair, Deepen graduated items, Tell apart look-alikes); the **hint ladder**; automatic grading after hints (one hint = Partly, two or more = Not yet); nudges; daily snapshots. Unit-tested with `node --test` | copy and rename the domain words (formula → word, scenario → verse). The composer's half-budget rule and the stage rules carry over unchanged |
| `js/store.js` | localStorage persistence, defaults, migration, export/import | as is (change the storage key) |
| `js/pad.js` | writing pad: pointer events, pen and eraser tools, full-screen expand, ink survives re-renders | as is, **but see RTL note below** |
| `js/app.js` | views, the recall loop UI, wrap-up, Progress (stage pipeline, momentum sparkline), Settings, hash routing, first-visit redirect | copy the structure; rewrite card rendering for Hebrew |
| `js/method.js` | the "How it works" page: the method in four steps, seven research sections with 24 DOI-verified references, a forgetting-curve figure | reuse the references and structure; add language-learning evidence (below) |
| `css/style.css` | tokens in `:root`, dark mode via `prefers-color-scheme` and `[data-theme]`, phone-first | as is; add Hebrew type |
| `test/` | unit tests for guide and store, `deck.check.mjs` (every deck item renders; every quiz item points at real entries), `linkcheck.py` (every source URL live) | copy the pattern; the deck check will validate Hebrew text and references instead of LaTeX |
| `docs/superpowers/specs`, `docs/superpowers/plans` | the spec and plan for the guided loop | read for the reasoning; write your own for this project |

The recall loop, which Steve has used and likes, works like this and should be kept: the card asks a question first ("What
does X mean?"), a rotating nudge says "say it out loud / write it / picture it", a writing pad sits under the question, two
buttons: *I have an answer* and *Give me a hint*. Hints climb a ladder, each giving away a little more. At reveal the learner's
sketch sits beside the answer. Grading is *Not yet / Partly / Got it*; a hinted answer grades itself. New items are introduced
as a "guess first" pretest with a line explaining that a wrong guess still helps. The wrap-up shows which items moved stage.

## How the statistics concepts map onto Hebrew

| In josie-stats | In hebrew-by-book | Notes |
| --- | --- | --- |
| a formula (37 of them) | a **lexeme** (dictionary word / root) that occurs in Ruth | start from a frequency list of Ruth's lexemes; verify the count rather than trusting a number |
| `latex` display formula | the lemma in pointed Hebrew, with root (shoresh), part of speech, binyan for verbs | pointed text (niqqud) by default; a setting to hide points |
| `meaning` / `when` | gloss(es) and usage notes (semantic range, idioms in Ruth) | glosses must come from a real lexicon, cited |
| `symbols` | the forms the word takes in Ruth (inflected forms, prefixes/suffixes), each with a parse | this is what "spotting it in the wild" needs |
| `cloze` (fill in the blank) | a Ruth verse with the target word blanked | the strongest card for recognition; one per occurrence, not one per word |
| `why` | etymology or a memorable hook, only where real | do not invent mnemonics that imply false etymology |
| scenario card, "Which formula?" | **"Which word?"**: a verse with one word highlighted, pick the right gloss from four look-alikes; and the reverse, a gloss, pick the word among four similar-looking words (same root letters, same pattern) | this is the interleaving / discrimination phase |
| `source` (OpenStax, NIST…) | lexicon and text sources with licences you have checked | see sources below |
| `links` "See it explained" | links to the verse in a reader (STEP Bible, Sefaria) and a lexicon entry | verify every URL live, as the stats repo does |
| Formulas sheet | a glossary view, filterable, grouped by chapter or frequency | |
| exam date cap | optional; a "finish Ruth by" date if Steve wants one | |

New card kinds worth adding that the stats app did not need:
- **Hear it**: audio of the word or verse. Reading aloud is already a nudge; for a language, listening and speaking are core.
  Only if a licensed audio source exists (check); otherwise speech synthesis is a poor substitute for Hebrew and should be skipped.
- **Read the verse**: an unseen verse from Ruth (or later, another book) with every already-learned word tappable. This is the
  "in the wild" test and the thing Steve asked for by name. Mark words by stage; the learner reads, then reveals glosses.
- **Parse it** (later): for verbs, identify binyan, person, gender, number. Only if Steve wants morphology drilling.

## Hebrew-specific things the stats app never had to handle

1. **Right-to-left text.** Set `dir="rtl"` and `lang="he"` on Hebrew elements, keep the surrounding UI LTR, and test mixed
   lines (a Hebrew word inside an English sentence) at phone width. Unicode bidi usually does the right thing; punctuation at
   line ends is where it goes wrong.
2. **Fonts.** The system Hebrew fonts render niqqud badly on some devices. Vendor a font with good pointing: SBL Hebrew
   (free for non-commercial use, check the licence) or Ezra SIL (OFL) or Noto Serif Hebrew (OFL). Load it locally like the
   stats app vendors KaTeX fonts, not from a CDN, so it works offline and does not shift layout.
3. **Niqqud and cantillation.** The source text carries vowel points and cantillation marks as combining characters.
   Decide per card what to show: pointed for learning, unpointed as an optional harder mode, cantillation stripped always
   (unless Steve reads with it). Write a small normaliser and unit-test it; comparisons and search must ignore marks.
4. **The writing pad in RTL.** The pad is a free canvas, so writing direction is the learner's choice; no change needed.
   But the "Your answer / The word" comparison at reveal should put the model answer in a large pointed font.
5. **Lemma vs surface form.** A single lexeme appears in Ruth in several forms (with prefixes ו, ה, ב, ל, suffixes, verb
   conjugations). Cards must distinguish "do you know this word?" from "can you recognise this form?". The morphology data
   below gives both.
6. **Proper names.** Ruth is full of them (רוּת, נָעֳמִי, בֹּעַז, מוֹאָב). Decide whether they are deck items (probably a
   small separate group, not drilled like vocabulary).

## Sources to consider (verify licences and URLs yourself before relying on them; that is the covenant)

- **Open Scriptures Hebrew Bible (OSHB) morphology**: the Westminster Leningrad Codex text with a lemma, Strong's number and
  a morphology code on every word. GitHub `openscriptures/morphhb`, CC BY 4.0 as of the last time this writer checked.
  This is the backbone: from it you can derive Ruth's lexeme list, every occurrence of each lexeme with its form and verse,
  and the cloze and "in the wild" cards automatically.
- **Lexicon glosses**: Brown-Driver-Briggs (public domain, available as data in several repos); STEP Bible's TBESH lexicon
  data (Tyndale House, CC BY); Strong's (public domain but shallow). Use BDB or TBESH for glosses, cite the entry.
- **Text readers to link to**: STEP Bible (stepbible.org) and Sefaria (sefaria.org, has an API and CC-licensed texts).
  Bible Hub interlinear pages are useful but check their terms before linking at scale.
- **Audio**: check whether a licensed recording of Ruth exists before promising a "Hear it" card.
- **Frequency**: derive from OSHB rather than quoting a published count; mark any number you did not compute as unverified.

## Process to follow (this matters more to Steve than any feature)

Read `C:\Users\steve\claude-here\claude-collab-playbook.md` before the first substantive exchange. In short: his anecdotes
are the spec (when he says "I was writing a formula with my finger and needed targeted erasing", that sentence is the
requirement); take spec-consistent defaults and log them as veto-able rather than making him the bottleneck; bank every
idea durably in STATUS.md; `STATUS.md` is the status surface and must be kept current so a dead session loses nothing.

**The review covenant** (his words: "let's keep this high standard of review going forward… different models and sources
to make sure that different perspectives are applied"): nothing user-facing ships without independent adversarial review by
separate subagents, on different models and against different sources. For this project that means every gloss, parse and
verse goes to one reviewer against the cited lexicon and one reviewer on another model against an independent lexicon or the
source text. Historical or etymological claims get the same treatment. Label findings VERIFIED / QUESTIONABLE / UNVERIFIED and
fix everything confirmed before pushing. Never report "verified" for anything inherited, including this document.

**Testing**: Steve asked that browser and end-to-end testing be run by a dedicated QA subagent with a written test plan
(selectors, expected values, pass/fail criteria), not inline. The stats repo's STATUS.md "QA" section shows the shape of a
plan that worked, including a multi-day simulation with a faked clock. Unit-test the pure logic with `node --test`.

**Publishing**: same pattern as josie-stats. Make this folder a git repo, push to a new public GitHub repo under
`steveandlori`, enable Pages from `main` root, keep a `.nojekyll`, and never commit anything with a licence that forbids it
(the stats repo gitignores Steve's daughter's class notes PDF for that reason). GitHub Pages caches scripts for ten minutes,
so a just-deployed change can look stale; a hard refresh fixes it.

## Research notes that carry over, and what to add

The stats app's "How it works" page cites 24 papers on retrieval practice, spacing, interleaving, pretesting, scaffolded hints,
honest self-grading, writing and the production effect. All apply to vocabulary. Add, with the same DOI-verification discipline:
the keyword method and its limits, the spacing literature specific to second-language vocabulary, and the evidence on
learning words in context versus in isolation (which is the research basis for the "in the wild" cards). Keep the register of
that page: declarative, specific, cited, no cheerleading.

## A reasonable first milestone

A vertical slice, then show Steve: the first chapter of Ruth as a deck (lexemes with pointed lemma, gloss, forms, verse
occurrences), the Today loop working with word cards and verse clozes, one "Which word?" discrimination set, the glossary,
and a "Read the verse" view for Ruth 1 with learned words highlighted. Research page can come second. Specs for later books
should need only a new data file, nothing in the engine.

## Things this writer does not know and the next agent should ask Steve early

- Does he read with or without niqqud, and does he want cantillation at all?
- Which lexicon does he trust, and does he own a copy of HALOT (which cannot be redistributed)?
- Does he want verbs parsed (binyan drills) or only recognised?
- Pace: how many new words a day feels right, and whether there is a date he is working toward.
- Proper names: drill or not?

Good luck. The stats project went from "a formula card nobody knew how to use" to a reviewed, tested guided loop in a day by
following the process above; the engine is the easy part, the review discipline is what made Steve trust it.
