# Brief: content review B, against independent sources

Read `docs/agents/COMMON.md` and `docs/agents/DESIGN.md` first. Report file: `docs/review/content-B.md`.

## Your job
Ignore the sources the app cites (TBESH, the OpenScriptures Lexical Index). Use independent references instead:
Sefaria's lexicon API (e.g. `https://www.sefaria.org/api/words/<pointed or unpointed word>`, which returns BDB and
Klein entries), Wiktionary, the full BDB as scanned/transcribed elsewhere online, and your own knowledge of Biblical
Hebrew (label anything from memory as UNVERIFIED unless you confirm it in a source).

The packet `docs/review/ruth-lexemes.md` lists every lexeme the app teaches with its shown gloss and first
occurrence, plus the 13 ketiv/qere places.

1. **Gloss fitness (all 285 vocabulary rows):** is the shown gloss a fair short meaning *for how the word is used in
   Ruth*? Flag glosses that are wrong, misleading in Ruth, too narrow, or interpretive (taking a side the text does
   not force). Known hazards to weigh: שָׂדֶה shown as "land" (BDB: field); מַרְגְּלוֹת shown as "feet" though BDB
   says "place of the feet" and the written form in 3:14 is singular; אֵת shown as "[Obj.]"; glosses shortened from
   TBESH's "general: specific" form may lose the Ruth sense (e.g. גָּאַל "to redeem" where Ruth's sense is the
   kinsman's duty to redeem). Propose a replacement gloss with a source for each flag.
2. **Ketiv/qere (13 places):** check each written and read form's parse against an independent analysis (e.g.
   Sefaria's text with its notes, a grammar or commentary available online). Steve's position: the app takes no
   side and keeps both readings. Note any place where the parse itself presupposes an interpretation (3:3 and 3:4
   ketiv tagged 1cs is a known one: others read the same ending as an archaic 2fs form), and suggest neutral
   wording if the app should mention that.
3. **Names (30):** spot-check identification and spelling.

Report: a findings table (id, severity, label, row/ref, current, proposed, source URL or reason), then a verdict.
Keep it under ~250 lines.
