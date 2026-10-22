# Brief: content review A, against the cited sources

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Report file: `docs/review/content-A.md`.

## Your job
Check that what the app shows for Ruth is faithful to the sources it cites. The packet `docs/review/ruth-lexemes.md`
lists every lexeme (shown gloss, raw TBESH gloss, BDB def and page, count, first occurrence with parse) and the 13
ketiv/qere places. The pinned source files are on disk in `data/sources/` (oshb/Ruth.xml, hebrewlexicon/*.xml,
tbesh/*.txt). The OSHB morphology code reference is https://hb.openscriptures.org/parsing/HebrewMorphologyCodes.html.

1. **Mapping (all rows):** for each vocabulary and name row, confirm the TBESH row used is the right one for the
   OSHB key (watch for TBESH sub-meaning rows "a Meaning of"/"a Part of" and name rows picked for ordinary words;
   one such bug, H2428 "Helech", was already found and fixed), and that the BDB def/page match the Lexical Index and
   BDB XML. A script that re-derives the joins independently of `pipeline/` is the best evidence.
2. **Parses:** spot-check at least 60 token parses across all four chapters, including every participle,
   infinitive and suffixed form you meet, against the raw morph codes in Ruth.xml and the OSHB code tables.
   Confirm the 13 ketiv/qere places (count, pairing, "what differs" tags) against Ruth.xml.
3. **Counts:** recompute each lexeme's count `n` from Ruth.xml and compare (state your counting rule; ketiv and qere
   tokens are both counted in the app).
4. **Prefix/suffix glosses** (TBESH H9002–H9039 rows) are attached to the right OSHB clitics and suffix persons.
5. **Names:** the Names tab labels each as person / place / people / title from TBESH's morph. Check each against
   Ruth's usage (e.g. is Ephrathah a person or a place in Ruth 4:11?).
6. **Neutrality:** search the app text (`js/`) and the data for any wording that calls a ketiv wrong or a qere a
   correction, or that renders a verse in English.

Report: a findings table (id, severity, label, row/ref, what you saw, where you saw it, suggested fix), then a
one-paragraph verdict. Keep it under ~250 lines.
