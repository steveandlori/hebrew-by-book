# Brief: review the English renderings and look-alike notes (Ruth)

Read `docs/agents/COMMON.md` first (folder scope, read-only rule, labels). Report file: `docs/review/renderings-1.md`.

## What changed
Steve asked (2026-10-22) for each word in its verse to show "a simple translation such as 'and she walked/went'"
first, with an abbreviated breakdown after it. The build now produces an English rendering for every token
(`pipeline/english.py`), using the OSHB parse and the corrected gloss. Overrides in `pipeline/overrides/ruth.json`
cover these: `_stems` (a verb's sense in a non-Qal stem), `_number_glosses`, `_participles` (a participle used as a
noun), `_renderings` (per-word fixes) and `_notes` (look-alike notes, e.g. אֶל vs אֵל "God").

## The deliberate conventions (do not report these as errors)
- **Tense from conjugation:** wayyiqtol and qatal come out as past, and yiqtol and weqatal as "will". A 2nd-person jussive is "you should", a 3rd-person jussive "let him", a cohortative "let me".
- **Pronouns:** the 2nd person keeps gender and number: "you (f)", "you (pl)", "you (f pl)". A masculine form addressed to women stays masculine, because the app shows what is written.
- **Glosses:** up to two senses are kept, as in "went / walked".
- **No smoothing:** word order and articles stay literal. Each token is rendered on its own, never as part of a translated verse.
- **Neutrality:** a written/read pair gets one rendering each, and neither may be called right. Do not suggest changes that resolve a ketiv/qere (Steve's covenant).

## Your job
1. **Read every row** of `docs/review/ruth-renderings.md`. Report renderings that are actually wrong for that form:
   - **Wrong stem sense:** e.g. the Hiphil rendered with the Qal sense.
   - **Wrong person, number or gender.**
   - **Misplaced object or possessive.**
   - **A sense absent from BDB for this verb or stem.**
   - **Broken English:** English that misleads a learner, beyond literal.
   - **Missing prepositions or articles.**

   Quote the token id. Propose an `en` value and give a BDB page (Sefaria's BDB, or the BDB page already in the data).
2. **Check every `_stems`, `_number_glosses`, `_participles`, `_renderings` and `_notes` entry against BDB.** Also check the two gloss changes, H8252 "to be quiet, rest" and H7646 "to be satisfied". Mark each VERIFIED / QUESTIONABLE / UNVERIFIED.
3. **Propose look-alike notes**, at most 10: very common Hebrew Bible words that a learner could confuse with a Ruth vocabulary word but that are not in Ruth (like אֵל for אֶל). Give each with a BDB page. Same-consonant pairs inside Ruth are already listed automatically.

Keep the report under ~200 lines. Lead with a table of the findings: id, current, proposed, label and source. Then cover the override checks, then the look-alike proposals. Do not edit any file except your report.
