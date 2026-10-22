# Renderings review 1 (Ruth): English renderings, overrides, look-alike notes

Reviewer: content subagent, 2026-10-22. I read all 1,306 token rows of `docs/review/ruth-renderings.md`, plus
`pipeline/english.py` and `pipeline/overrides/ruth.json`. I checked BDB on Sefaria with `curl` against
`/api/words/<form>?lookup_ref=Ruth x:y`, which worked; Python's urllib got a 403. Page numbers come from each
lexeme's `bdb.page` in `data/ruth.js` unless marked "(mem.)", meaning from memory and UNVERIFIED.
**VERIFIED (Sef.)** means I read the quoted BDB wording on Sefaria. **VERIFIED (data)** means the row output
or the code shows the problem directly. I did not report anything the brief lists as a convention: tense from
conjugation, "you (f)", two senses, literal articles, k/q neutrality.

Totals: **MUST-FIX 8 findings (11 tokens) · SHOULD-FIX 23 findings (~40 tokens) · MINOR 12.**

## 1. Findings table

| # | id(s) | current | proposed `en` | sev | label · source |
|---|---|---|---|---|---|
| 1 | 08j1i (1:11), 089gS (1:21) | to what? | why? | MUST | VERIFIED (Sef.): BDB מָה 4.d, "לָמָּה … for what reason? why?", p. 552–554 |
| 2 | 084W9 (1:13) | you (f pl) will shut oneself off | you (f pl) will shut yourselves off | MUST | VERIFIED (Sef.): BDB עָגַן p. 723, "would ye shut yourselves off" (Ru 1:13) |
| 3 | 0875P (1:11) | in my inner parts / wombs | in my womb / inner parts | MUST | VERIFIED (Sef.): BDB מֵעֶה p. 588 "only pl."; sense 3 "= womb … Ru 1:11". `pluralize` makes "wombs". Add `_number_glosses` H4578 `p: "womb / inner parts"` |
| 4 | 081bY (4:4) | exception you | except you / besides you | MUST | VERIFIED (Sef.): BDB זוּלָה p. 265 "prep. except, besides … Ru 4:4". The code appends the object pronoun to a non-noun |
| 5 | 083iR (2:9) | your (f) touching | touching you (f) | MUST | VERIFIED (data): the suffix is the object of נָגַע ("not to touch you"). The possessive reverses who touches whom. The cause: after לְבִלְתִּי, `to_inf` is false, so the suffix becomes a possessive |
| 6 | 08LGP (4:9), 08cog (4:10), 08Vgg (4:11) | witness | witnesses | MUST | VERIFIED (data): עֵדִים is mp. The bug is `pluralize()`, which skips any gloss ending in "s" ("witness"). BDB עֵד p. 729 |
| 7 | 084Ed (4:8) | to/for you (f) | to/for you | MUST | VERIFIED (Sef. text): קְנֵה־לָ֑ךְ carries athnach, so it is the pausal **2ms** (said to Boaz). OSHB/data tag it 2fs. This is a parse error, not a gender convention |
| 8 | 08sHf (1:13) | he was bitter | it was bitter | MUST | VERIFIED (Sef.): BDB מָרַר p. 600, "impers. מַר־לִי מְאֹד מִכֶּם Ru 1:13 it is very bitter to me". "he" points the learner to a person or to God |
| 9 | 08GmF (2:11) | he was told | it was told | SHOULD | VERIFIED (data): impersonal Hophal ("it has been fully told to me"). Same class as #8 |
| 10 | 08F88 (2:3) | and he happened / befell | and it happened / befell | SHOULD | VERIFIED (data): the subject is מִקְרֶהָ "her chance" (m). BDB קָרָה p. 899 |
| 11 | 08TW6 (1:13) | she went out | it went out | SHOULD | VERIFIED (data): the subject is יַד יְהוָה (f). "she" reads as Naomi |
| 12 | 08W7V (2:12) | and let her be | and let it be | SHOULD | VERIFIED (data): the subject is מַשְׂכֻּרְתֵּךְ "your wage" (f) |
| 13 | 08H3W (3:1), 08hvK (3:7) | he will be good / and he was good | it will be good / and it was good | SHOULD | VERIFIED (data): 3:1 is impersonal "that it may be well for you"; in 3:7 the subject is לִבּוֹ. BDB יָטַב p. 405 |
| 14 | 08bJa (3:18), 08eWk (4:10), 08j2a (4:14) | he will fall / he will be cut off / and he will be called | it will fall / it will be cut off / and it will be called | SHOULD | VERIFIED (data): the subjects are דָּבָר and שֵׁם (twice). With "he", "he will be called his name" misleads |
| 15 | 08pu1 (4:15) | and it will be | and he will be | SHOULD | VERIFIED (data): the subject is the child ("he shall be to you a restorer"). The forced `H1961 3ms → "it"` rule is wrong here |
| 16 | 08vdQ (2:19) | let it be | let him be | SHOULD | VERIFIED (data): יְהִי מַכִּירֵךְ בָרוּךְ, "may the one who noticed you be blessed". Same forced "it" rule |
| 17 | 085KE (1:19) | and she made noise | and she was in a stir | SHOULD | VERIFIED (Sef.): BDB הוּם p. 223 Niph. "be in a stir, of a city Ru 1:19". This is the wrong stem sense; add `_stems` H1949 `N: "to be in a stir"`. ("it" would also suit עִיר, as in #11) |
| 18 | 08w4T (2:14) | and he served | and he held out | SHOULD | VERIFIED (Sef.): BDB צָבַט p. 840, "vb. reach, hold out, to (ל pers.)", with only Ru 2:14. "serve" is not in BDB, so change the gloss H6642 to "to reach, hold out" |
| 19 | 08NQN (1:4) | and they lifted | and they took (as wives) | SHOULD | VERIFIED (Sef.): BDB נָשָׂא p. 669–672, 3.d "take as wife … Ru 1:4". The headword is "lift, carry, take". "they lifted women" misleads |
| 20 | 08pww (3:3) | you (f) should be known | you (f) should make yourself known | SHOULD | VERIFIED (Sef.): BDB יָדַע Niph. 2 "make oneself known, of pers., sq. לְ Ru 3:3", p. 393–394 |
| 21 | 08Azu (2:5) | to who? | whose? / to whom? | SHOULD | VERIFIED (Sef.): BDB מִי p. 566, "לְמִי to whom? whose?" "to who?" is broken English |
| 22 | 08PTT (4:4) | nothing | there is not / none | SHOULD | VERIFIED (Sef.): BDB אַיִן p. 34–35, "denying existence … there is none". Systemic for אֵין used as a particle |
| 23 | 08cgg (3:2) | our kinsman | our kindred | SHOULD | VERIFIED (Sef.): BDB מֹדַעַת p. 396, "n.f. kindred, kinship … Ru 3:2 is not Boaz (of) our kindred?" Fix the gloss H4130. "kinsman" also collides with מוֹדַע at 2:1 Qr |
| 24 | 085gQ (1:4), 08Mjg (2:17) | like ten / like ephah | about ten / about ephah | SHOULD | UNVERIFIED (Sef. lookup of כְּ returned nothing): BDB כְּ p. 453 (mem.), "with numbers: about". "like ten years" misleads |
| 25 | 08cK8 (1:19) | like their (f) coming (in) | as their (f) coming (in) | SHOULD | UNVERIFIED: BDB כְּ with inf. "when, as" p. 454–455 (mem.). Systemic: H9004 + infinitive construct |
| 26 | 08ssA (4:16) | to nurse | as nurse / for a nurse | SHOULD | VERIFIED (data): "to nurse" reads as an English infinitive. BDB אָמַן p. 52 ptc. "nurse", and לְ "for, as" (mem.) |
| 27 | 08tKf, 08D3a (2:5, 6) | the one being stationed (over) | the one stationed (over) | SHOULD | VERIFIED (Sef.): BDB נָצַב p. 662 Niph. 2 "be stationed = appointed over (על) … Ru 2:5, 6". "being" suggests a process |
| 28 | 08GzE (1:2), 083TS (1:4) | Ephrathite / Moabite | Ephrathites / Moabite (women) | SHOULD | VERIFIED (data): these are mp and fp gentilic nouns. The `lex.name` check skips pluralizing them |
| 29 | 089Dq, 08WSe (2:19), 08gLV (3:18), 08L3V (4:9), 08SmU (4:10), 08w2r (4:14) | the day | today / the day | SHOULD | VERIFIED (Sef.): BDB יוֹם p. 400, "Phrases: הַיּוֹם = to-day". QUESTIONABLE against the "articles literal" convention, but BDB lists it as a phrase, and "witnesses you are the day" is not a literal reading |
| 30 | 08WeU (4:5) | and from (object marker) | and from (with) | SHOULD | QUESTIONABLE: the data tags H853 (object marker) after מִן, so the English is broken either way. Read as אֵת "with" + מִן it is "from (with)" (BDB אֵת II p. 85–86). Not a k/q pair; it is a known crux, so offer the literal "and from" without choosing a reading |
| 31 | 08Ap3 (1:12) | I was old | I became old | SHOULD | VERIFIED (Sef.): BDB זָקֵן vb. p. 278, "be or become old … זָקַנְתִּי מִהְיוֹת לאישׁ Ru 1:12 I am too old". This keeps the past-tense convention |

MINOR (one line each, all VERIFIED (data) unless noted):
- 08S38 (2:7) "from since" should be "since". H227b's gloss already includes מִן, so add it to `COMBINED`.
- 08wJn (1:13) "being" and 08T97 (3:10) "going / walking" come after לְבִלְתִּי; "to be" and "to go" read better. #5 has the same root cause.
- 08bmv, 08doW, 0876o: "their two" should be "the two of them".
- 08WDP (2:10) אָרְצָה: "to land" should be "to (the) ground" (BDB אֶרֶץ p. 75–76, "ground").
- 086n2 (2:14) לְעֵת "to time of" should be "at time of" (לְ of time).
- 08BYa (1:7) "to there" should be "there(ward)".
- Comparative מִן: 08ddd (1:13), 084YU (3:10) and 08NH6 (4:15) "from" could be "(more) than". This is literal and acceptable, but worth a note.
- 08G2d (2:20) "from our redeemer": BDB and most readers take it as partitive, "one of our redeemers" (QUESTIONABLE).
- אֲשֶׁר is always "which", even for persons (2:19, 2:20, 4:1, 4:14). Consider "who / which".
- דָּבָר "word" in 3:18 and 4:7 means "matter" (BDB p. 182, "word, matter, thing"). Consider the gloss "word, matter".
- 08rWk (2:21) עַד אִם: "if" should be "(until) if"; BDB עַד p. 725 (mem.) has "until".
- 085oN and 08Tgd לְאִשָּׁה: "to woman / wife" could be "as woman / wife".

## 2. Override checks (against BDB)

**`_stems`** (VERIFIED (Sef.) where marked. All others UNVERIFIED but consistent with BDB as I know it, and I found nothing against them.)
- H7604 N "to be left": OK. H7663b p "to wait for": OK. H6912 N: OK. H4843 h "make bitter": OK. H7725 h "bring back": OK.
- H5702 N "to shut oneself off": **VERIFIED (Sef.)**, but rendering it needs a reflexive pronoun (finding #2).
- H5162 p "comfort": OK. H5046 H "to be told": OK, but the subject needs to be "it" (#9).
- H5234a h "to recognize, notice": QUESTIONABLE in order only. When there is an object, only the first sense is kept, so 2:10 shows "to recognize me" where BDB has "regard, take notice of". Reorder to "notice, recognize" (MINOR).
- H7999a p "repay", H3498 h "leave over", H3637 h "humiliate", H3318 h "bring out", H3190 h, H3772 N, H7121 N, H7673a h: OK.
- H3045 N "to be known": **QUESTIONABLE**. BDB Niph. sense 2 is "make oneself known … Ru 3:3" (VERIFIED (Sef.)), so 3:3 needs #20. 3:14 is overridden correctly. P "to be known" is OK, and 08ygU uses the token gloss anyway.
- H3943 N "twist, turn over": OK. H6965b h "raise up" / p "confirm": OK.
- H3205 q/P/h: OK. H7812 v "bow down": OK (BDB files the form under שָׁחָה Hithpalel, p. 1005).
- **Missing:** H1949 N "to be in a stir" (#17).

**`_number_glosses`**: H4772 OK (k singular, q plural; neutral). H430 "God / god(s)": OK and neutral. H6440 OK. H2416a OK. H2205 "elders" OK. H7934: the `why` says the spelling "neighbour" is kept apart from רֵעַ's "neighbor", but the plural override prints "neighbors", which undoes that (MINOR, QUESTIONABLE). **Missing:** H4578 (#3).

**`_participles`**: H1350a "redeemer(s)" OK (BDB p. 145, ptc. as subst.). H4191 "dead one(s)" OK. H539 "nurse" is OK as a gloss, but after לְ it renders as "to nurse" (#26).

**`_notes`**: H413 is **VERIFIED**. The data confirms אֵל (H410) is not in Ruth, and the BDB pages (אֶל p. 39, אַל p. 39, אֵל p. 42) agree with the data's `bdb.page` for H413 and H408. H408 is **VERIFIED**: אַל תִּקְרֶאנָה is at 1:20 (08ta1, 08JnD).

**`_renderings`**:
- 08Uv6 "let it be known": **VERIFIED**, impersonal Niphal jussive (BDB p. 393).
- 08CGY "formerly": **VERIFIED (Sef.)**, BDB פָּנֶה 6, "adv. temp. לְפָנִים formerly" (p. 816).
- 08jGA "to one bringing back": **VERIFIED** in substance (Hiph. ptc. "restorer").

**`_token_glosses`** 08ygU "acquaintance, known one": **VERIFIED (Sef.)**, BDB יָדַע Pu. "elsewhere as subst. = acquaintance … Kt מידע Ru 2:1 (Qr מוֹדַע)".

**Gloss changes:**
- H8252 "to be quiet, rest": **VERIFIED (Sef.)**, BDB שָׁקַט p. 1052, "be quiet, undisturbed … of Boaz Ru 3:18 he will not be quiet until he has finished".
- H7646 "to be satisfied": **VERIFIED (Sef.)**, BDB שָׂבֵעַ p. 959, "be sated, satisfied, surfeited".

**Other gloss problems found while reading** (data-level, not renderings):
- H6642 "to serve" is not a BDB sense (#18).
- H4130 "kinsman" should be "kindred" (#23).
- H1949 "to make noise" is the Qal-ish sense (#17).

## 3. Proposed look-alike notes (10)

None of these lexemes is in Ruth. I checked each Strong's key against `data/ruth.js` lexemes. I confirmed each meaning
in the BDB on Sefaria. The page numbers are from memory, so they are UNVERIFIED.

| Ruth word | Not to confuse with (not in Ruth) | Note text (draft) | BDB |
|---|---|---|---|
| אִישׁ man | **אֵשׁ** "fire" (~375×) | Not אֵשׁ "fire" (tsere, no yod). | p. 77 (mem.) |
| אִשָּׁה woman | **אִשֶּׁה** "offering by fire" (~65×) | Not אִשֶּׁה (segol, final he), "offering made by fire", common in Leviticus. | p. 77 (mem.) |
| לֶחֶם food, bread | **לָחַם / נִלְחַם** "fight" (~170×) | Same consonants; the verb "fight, do battle" is mostly Niphal. | p. 535 (mem.) |
| דָּבָר word | **דֶּבֶר** "pestilence" (~50×) | Same consonants; segol–segol, "plague". | p. 184 (mem.) |
| יוֹם day | **יָם** "sea" (~390×) | יָמִים "days" vs. יַמִּים "seas" (dagesh). | p. 410 (mem.) |
| רֵעַ neighbor | **רַע** "bad, evil" (~350×) | Not רַע "evil" (patach, no furtive). | p. 948 (mem.) |
| הָיָה to be | **חָיָה** "to live" (~280×) | ה vs. ח: "be" vs. "live". | p. 310 (mem.) |
| גָּאַל redeem | **גָּאַל II** "defile" (~11×) | A homograph; "defile" is late and rare. Never "redeem" in Is 59:3, La 4:14. | p. 146 (mem.) |
| קָרָא call | **קָרָא II** "encounter, befall" (in לִקְרַאת "to meet", ~120×) | Same root letters; the "meet" sense parallels קָרָה (2:3). | p. 896 (mem.) |
| אֲשֶׁר which | **אַשּׁוּר** "Assyria" (~150×) | Not אַשּׁוּר "Asshur/Assyria" (patach, dagesh in shin). | p. 78 (mem.) |

(Also worth listing, though both words are in Ruth and do not share consonants, so the automatic list misses
them: לָקַח "take" vs. לָקַט "glean", and וַתָּשָׁב "she returned" vs. וַתֵּשֶׁב "she sat".)

## 4. Systemic causes in `english.py` (for the fixer)
1. A 3rd-person subject comes from the parse only. Inanimate or impersonal subjects get "he" or "she" (#8–#14). The forced `H1961 3ms → it` rule fails where the subject is a person (#15, #16). Per-token `_renderings` are the safe fix, since the code cannot see the subject.
2. `pluralize`: `noun.endswith("s")` skips "witness" (#6). Gentilic nouns are never pluralized (#28).
3. A suffix on an infinitive after a preposition other than לְ becomes a possessive even when it is the object (#5). After לְבִלְתִּי, the infinitive gets "-ing" (MINOR).
4. A non-noun with a suffix appends the object pronoun ("exception you", #4).
5. Reflexive Niphal stem glosses ("oneself") are not inflected for person (#2).
6. `PREFIX_EN` כְּ = "like" before numbers and infinitives (#24, #25). לְ = "to" before a participle used as a noun (#26).
