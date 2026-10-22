# Hebrew by Book: design as built (first slice, 2026-10-22)

## Purpose
Steve has translated Ruth before. The gap is retention and recognising words "in the wild". The engine (spaced
repetition, guided daily loop, hints, honest self-grading, writing pad) is adapted from his josie-stats app.
Later books must need only a new data file.

## Data (pipeline/, Python, built once into data/ruth.js)
- **Text and parsing:** Open Scriptures Hebrew Bible (OSHB, `openscriptures/morphhb` at commit 3d15126…, CC BY 4.0;
  WLC text public domain). Each `<w>` becomes a token with segments (prefixes / main word / suffixes), each with its
  OSHB lemma key and morph code, decoded to English by `pipeline/morph.py` from OSHB's published code tables.
- **Ketiv and qere** are both first-class tokens. Ruth has 13 places: 10 pairs, 1 written-not-read (3:12 אם),
  2 read-not-written (אֵלַי 3:5, 3:17). Each place gets a neutral "what differs" tag (person, gender, number,
  conjugation, word, spelling).
- **Glosses:** TBESH (STEPBible.org, CC BY 4.0), Gloss column only, shortened to the part before TBESH's colon
  ("strength: worthy" → "strength"). The TBESH Meaning column is Online Bible material and is not used.
  Row choice: OSHB decides whether a lexeme is a name (Np/Ng/Ag); TBESH name rows are used only for names.
- **Definitions and citations:** OpenScriptures HebrewLexicon (CC BY 4.0): AugIndex maps the OSHB key to a Lexical
  Index entry (headword, transliteration, part of speech, short BDB-derived definition, BDB entry id); the BDB XML
  gives the page. Shown as "BDB p. N: def".
- **Overrides:** `pipeline/overrides/ruth.json` (does not exist yet) can replace a gloss; each override must carry
  `why` and `source`, and the app shows the original TBESH gloss with the reason.

## App (static ES modules, no build step; js/)
- `deck.js` builds cards per vocabulary word (285 words in Ruth, names and prefixes excluded):
  `recall` (dictionary form → meaning), `ctx` (a verse with one occurrence highlighted → meaning),
  `form` (up to two other spellings), `which` (a highlighted form → which of four look-alike dictionary words).
  Words are introduced by chapter of first appearance, then frequency.
- `guide.js`: stages New → Learning → Graduated → Solid; daily composer: due cards, then N new words (each a
  recall + ctx pair), then up to N deepen/tell-apart cards for graduated words. N = "new words per day" (default 10).
- `app.js` views: Today (guided loop), Read (verses with tappable words, stage underlines, glosses toggle; a sheet
  shows parse, segments, dictionary word, BDB, and both readings where ketiv and qere differ), Written and read
  (the 13 places), Words, Names, Progress, How it works, Settings (pointed/unpointed, size, buttons, pad, export).
- Pointed mode leads with the read form (qere) and shows the written consonants in brackets marked כ; unpointed
  mode leads with the written consonants and shows the read form marked ק. Cantillation is stripped.
