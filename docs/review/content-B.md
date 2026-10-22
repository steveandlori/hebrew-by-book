# Content review B: Ruth glosses, ketiv/qere and names, checked against independent sources

Reviewer: content agent B, 2026-10-22. I did not use the app's cited sources (TBESH, OpenScriptures Lexical Index) as
evidence. The packet `docs/review/ruth-lexemes.md` was used only to read what the app *shows*.

**Sources used**
- **BDB (Sefaria):** Sefaria's lexicon API, `https://www.sefaria.org/api/words/<word>?never_split=1`. It returns two
  things: "BDB Dictionary", the full BDB entry with Ruth citations, and "BDB Augmented Strong", BDB's sense outline.
  Citations below write these as "BDB (Sefaria)" and "BDB-Aug". I checked every VERIFIED item in a live fetch on
  2026-10-22.
- **GKC:** Gesenius' Hebrew Grammar §44h on Wikisource,
  <https://en.wikisource.org/wiki/Gesenius%27_Hebrew_Grammar/44._Flexion_of_the_Perfect_of_Qal>.
- **Raw data:** `data/ruth.js`, `pipeline/build.py` and the pinned OSHB file `data/sources/oshb/Ruth.xml`. I read
  these only for counts and to locate defects.
- **Memory:** anything resting only on my own knowledge is labelled UNVERIFIED.

**Counts checked:** there are 285 drilled rows, confirmed by script against `data/ruth.js`. That number is itself wrong;
see F1.

## Findings

Severity: **M** = MUST-FIX, **S** = SHOULD-FIX, **m** = MINOR. Label: **V** = VERIFIED, **Q** = QUESTIONABLE,
**U** = UNVERIFIED. "Ru" references are to the use in Ruth. "BDB (Sefaria)" means the Sefaria BDB entry for the word
named.

### A. Structural and data defects found while checking glosses

| id | sev | lab | row/ref | current | proposed | source / reason |
|---|---|---|---|---|---|---|
| F1 | M | V | H935 בּוֹא (18×), H970 בָּחוּר (1×), H996 בַּיִן (3×) | treated as affixes: not drilled, no BDB | drill them (vocab = 288); gloss בּוֹא "to come, go in", בָּחוּר "young man", בַּיִן "between" | `pipeline/build.py` line 80 `if k.startswith("H9")` catches Strong's 935/970/996, not only the H9000+ affix rows; `data/ruth.js` has `"H935":{"affix":1,...,"n":18}`. בּוֹא is the 4th most frequent verb in Ruth. |
| F2 | m | V | H1035 בֵּית לֶחֶם | n = 14 | n = 7 | Each two-word occurrence is counted twice: 1:1, 1:2, 1:19 ×2, 1:22, 2:4, 4:11 (script over `data/ruth.js`). |
| F3 | S | V | shown "BDB p. N: def" | the short def is often BDB's root or etymology head-word, not a meaning: נָא "I", הָיָה "fall out", בִּלְתִּי "failure", עוֹד "a going round", מְאֹד "muchness", אַחַר "the hinder", מֵאֲשֶׁר "who", עֶרֶב "set", נֶגֶד "what is conspicuous" | suppress or replace these defs. נָא "I" is a truncation of "I pray". | Packet column "BDB def" compared with BDB (Sefaria) senses for the same words. |
| F4 | m | V | parse strings | "noun, bs, construct" (3:2 גֹּרֶן), "bd", "bp" | "common sg./du./pl." | The raw OSHB gender code "b" (both) leaks into the English parse. |
| F5 | S | V | 26 English glosses shared by two or more words | e.g. land (שָׂדֶה/אֶרֶץ), ear (אֹזֶן/שִׁבֹּלֶת), there (יֵשׁ/שָׁם), maidservant (אָמָה/שִׁפְחָה), lest (בִּלְתִּי/פֶּן), youth (יֶלֶד/נַעַר), to gather (לָקַט/אָסַף), to take (לָקַח/שָׁלַל), if (אִם/כִּי אם־) | fixed below where the shared gloss is also wrong. True synonyms (I, not, this, where?, here) can stay. | Script over `data/ruth.js`. Shared glosses make `recall` answers ambiguous and `which` cards unanswerable by meaning. |

### B. Gloss fitness (vocabulary)

| id | sev | lab | row/ref | current | proposed | source / reason |
|---|---|---|---|---|---|---|
| G1 | M | V | H4843 מָרַר (1:13, 1:20) | to provoke | to be bitter; (Hiph.) make bitter | BDB (Sefaria) מָרַר: "מַר־לִי מְאֹד Ru 1:13 it is very bitter to me"; "הֵמַר שַׁדַּי לִי מְאֹד Ru 1:20". "Provoke" also hides the pun on Naomi/Mara. |
| G2 | M | V | H5162 נָחַם (2:13, Piel) | to be sorry | to comfort (Piel); be sorry (Niph.) | BDB-Aug נָחַם: Piel "to comfort, console". Shortening the gloss to the part before TBESH's colon dropped the Ruth sense ("to be sorry: comfort"). |
| G3 | M | V | H3426 יֵשׁ (1:12, 3:12) | there | there is / there are | BDB-Aug יֵשׁ: "being, existence, there is or are". "There" duplicates שָׁם (F5) and is wrong. |
| G4 | S | V | H1431 גָּדַל (1:13) | to magnify | to grow up, become great | BDB (Sefaria) גָּדַל 1a "grow up, child … Ru 1:13". "Magnify" is the Piel/Hiphil sense. |
| G5 | S | V | H7704b שָׂדֶה (16×) | land | field | BDB (Sefaria) שָׂדֶה: "cultivated ground … Ru 2:2 + 47 times"; also "territory of nation … Ru 1:1, 2". "Field" covers both (שְׂדֵי מוֹאָב, "fields of Moab"). "Land" collides with אֶרֶץ. |
| G6 | S | V | H4772 מַרְגְּלוֹת (3:4, 7, 8, 14) | feet | place of (his) feet | BDB (Sefaria): "place of the feet, feet … Ru 3:4, 7; adv. = at his feet v 8 + v 14 Qr (Kt מרגלתו)". This gloss also suits the singular ketiv at 3:14 without choosing. |
| G7 | S | V | H1350a גָּאַל (22×) | to redeem | to redeem, act as kinsman | BDB (Sefaria) גָּאַל: "act as kinsman, do the part of next of kin (chiefly in … Ru.) … Ru 3:13 … in redeeming a field Ru 4:4, 6". |
| G8 | S | V | H1353 גְּאֻלָּה (4:6, 7) | redemption | right of redemption | BDB (Sefaria) גְּאֻלָּה: "right of redemption … Ru 4:6"; "redemption, of field … Ru 4:7". |
| G9 | S | V | H3205 יָלַד (14×) | to beget | to bear, beget | BDB-Aug יָלַד: Qal "to bear, bring forth", Hiph. "to beget". In Ruth women bear (1:12, 4:12, 13, 15) and the genealogy begets (4:18–22). |
| G10 | S | V | H3206 יֶלֶד (1:5, 4:16) | youth | child, boy | BDB (Sefaria) יֶלֶד: "child = son, boy". At 4:16 it is a newborn. Also collides with נַעַר. |
| G11 | S | V | H3950 לָקַט (12×) | to gather | to glean, gather | BDB (Sefaria): "specif. glean, after the reapers … Ru 2:3, 7 (‖ אָסַף) … v 15, 16, 23". Collides with אָסַף. |
| G12 | S | V | H3427 יָשַׁב (11×) | to dwell | to sit, dwell, stay | BDB (Sefaria) יָשַׁב: "sit, sit down … Ru 4:1, 2". Ruth 2:14, 3:18 and 4:1–4 are sitting or staying, 1:4 is dwelling. |
| G13 | S | Q | H7069 קָנָה (4:4–10) | to buy | to acquire, buy | BDB-Aug: "to get, acquire, obtain … to buy". "Buy" is right for the field. Applied to Ruth (4:5, 10) it takes a side the text does not force. |
| G14 | S | V | H2428 חַיִל (2:1, 3:11, 4:11) | strength | worth, strength, wealth | BDB-Aug: "strength, might, efficiency, wealth". BDB (Sefaria) puts אֵשֶׁת חַיִל Ru 3:11 under "ability, efficiency, often involving moral worth". |
| G15 | S | V | H2896a טוֹב (2:22, 3:13, 4:15) | pleasant | good | BDB-Aug: "good, pleasant, agreeable". BDB (Sefaria) cites Ru 4:15 for comparative "better". |
| G16 | S | V | H1540 גָּלָה (3:4, 7; 4:4) | to reveal | to uncover | BDB (Sefaria): "feet Ru 3:4, 7"; "גָּלָה אֹזֶן uncover the ear … Ru 4:4". |
| G17 | S | V | H1115 בִּלְתִּי (1:13, 2:9, 3:10) | lest | not; (לְבִלְתִּי) so as not | BDB-Aug: "not, except … with prep: so as not, in order not". Collides with פֶּן. |
| G18 | S | V | H6485a פָּקַד (1:6) | to reckon | to visit, attend to | BDB (Sefaria): "of י׳, visit graciously … Ru 1:6". |
| G19 | S | V | H7136a קָרָה (2:3) | to meet | to happen, befall | BDB (Sefaria): "וַיִּקֶר מִקְרֶהָ Ru 2:3 her chance lighted upon a field". |
| G20 | S | V | H4745 מִקְרֶה (2:3) | accident | chance | BDB (Sefaria): "accident, chance … c. קָרָה Ru 2:3". In modern English "accident" means a mishap. |
| G21 | S | V | H539 אָמַן (4:16) | be faithful | to support; (ptc.) nurse | BDB (Sefaria) אָמַן: "אֹמֶנֶת foster-mother, nurse Ru 4:16". |
| G22 | S | V | H4138 מוֹלֶדֶת (2:11) | relatives | kindred, birth | BDB (Sefaria): "אֶרֶץ מ׳ land of one's kindred … Ru 2:11". |
| G23 | S | V | H6293 פָּגַע (1:16, 2:22) | to fall on | to meet; urge, entreat | BDB (Sefaria): "encounter with request, entreat … Ru 1:16"; "encounter with hostility, fall upon … Ru 2:22". |
| G24 | S | V | H7997a שָׁלַל (2:16) | to take | to pull out | BDB (Sefaria) שָׁלַל: "vb. draw out … שֹׁל־תָּשֹׁלּוּ לָהּ Ru 2:16". Also collides with לָקַח. |
| G25 | S | V | H2219 זָרָה (3:2) | to scatter | to winnow | BDB (Sefaria): "fan, winnow, obj. גֹּרֶן הַשְּׂעוֹרִים Ru 3:2". |
| G26 | S | V | H7489a רָעַע (1:21, Hiph.) | be evil | to do harm, afflict | BDB-Aug: Hiph. "to do an injury or hurt". |
| G27 | S | V | H7641b שִׁבֹּלֶת (2:2) | ear | ear of grain | BDB-Aug: "ear (of grain), head of grain". Collides with אֹזֶן. |
| G28 | S | V | H519 אָמָה (3:9) and H8198 שִׁפְחָה (2:13) | both "maidservant" | אָמָה "handmaid"; שִׁפְחָה "maidservant" | BDB (Sefaria) heads them "maid, handmaid" and "maid, maid-servant", and notes the parallel "Ru 3:9 (‖ שׁפחה 2:13)". Distinct glosses let the learner see the switch without being told what it means. |
| G29 | S | V | H3212 יָלַךְ (15×) and H1980 הָלַךְ (3×) | to walk / to go | one verb: "to go, walk", or gloss יָלַךְ "to go (forms of הָלַךְ)" | BDB treats them as one entry: both rows cite p. 229, and BDB-Aug יָלַךְ gives "to go, walk, come". H3212 is a Strong's split, not a separate verb. "To walk" misleads in 1:1 ("went to sojourn"). |
| G30 | S | V | H3588b כִּי אם־ and H518b כִּי אם־ (3:18) | two rows, same headword, "that if" and "if" | one row, or label each half; Ruth sense "but rather / until" | Duplicated headwords seen in the packet (rows 204, 232). The Ruth sense is from memory (UNVERIFIED): at 3:18 the phrase is "will not rest until he has finished". |
| G31 | S | V | H227b מֵאָז (2:7) | the past | since, from (then) | The packet's own BDB column reads "from that time". The text is מֵאָז הַבֹּקֶר, "since the morning". |
| G32 | S | V | H834d כַּאֲשֶׁר (1:8) | as which | as, just as | BDB def "according as" (packet). "As which" is not English. |
| G33 | S | Q | H430 אֱלֹהִים (1:15, 16, 17; 2:12) | God | God; gods | BDB (Sefaria) lists Ru 1:15, 16 together under suffixed forms. At 1:15 אֱלֹהֶיהָ (Orpah's) is singular or plural depending on the reader, so "God" takes a side. |
| G34 | S | V | H4578 מֵעֶה (1:11) | belly | inner parts, womb | BDB (Sefaria): "= womb … Ru 1:11". |
| G35 | m | V | H553 אָמֵץ (1:18, Hith.) | to strengthen | be determined | BDB (Sefaria): "confirm oneself in a purpose, be determined Ru 1:18". |
| G36 | m | V | H5324 נָצַב (2:5, 6) | to stand | to be stationed (over) | BDB (Sefaria): "be stationed = appointed over (על) … Ru 2:5, 6". Collides with עָמַד. |
| G37 | m | V | H3615 כָּלָה (2:21, 23; 3:3, 18) | to end | to finish, complete | BDB (Sefaria): "finish … Ru 2:21; Ru 3:3"; "accomplish … Ru 3:18". |
| G38 | m | Q | H6030b עָנָה (1:21) | to answer | to answer, testify (against) | BDB (Sefaria): "testify … usually against … Ru 1:21 (… Vrss … עִנָּה humiliate)". The ancient versions vocalize it differently. If the app notes this, it should say so without picking a reading. |
| G39 | m | V | H5315 נֶפֶשׁ (4:15) | soul | life, soul, self | BDB (Sefaria): השׁיב נ׳ = "refresh, cheer … Ru 4:15". |
| G40 | m | U | H376 אִישׁ and H802 אִשָּׁה | man / woman | man, husband / woman, wife | From memory: 1:1 וְאִשְׁתּוֹ "his wife"; 1:3, 1:5 "her husband". |
| G41 | m | U | H5288 נַעַר / H5291 נַעֲרָה | youth / maiden | young man, servant / young woman, servant girl | Boaz's workers (2:5–9, 21–23). The packet's BDB column gives "boy" and "girl". |
| G42 | m | U | H2205 זָקֵן (adj.) | old | old; elder | 4:2, 4, 9, 11 are "the elders" of the town (from memory). |
| G43 | m | V | H3588a כִּי / H6213a עָשָׂה / H3318 יָצָא / H5927 עָלָה | for / to make / to come out / to ascend | for, that, because / to do, make / to go out / to go up | The packet's BDB column gives "that", "do", "go out", "go up". These match the Ruth uses (1:8 "deal kindly", 1:7 "went out", 4:1 "went up"). |
| G44 | m | V | H7223 רִאשׁוֹן / H314 אַחֲרוֹן (3:10) | first / last | former / latter | The packet's BDB column gives "former" and "coming after". The text is "your latter kindness … than the former". |
| G45 | m | U | small misfits: H1870 דֶּרֶךְ "Way"; H853 אֵת "[Obj.]"; H834c מֵאֲשֶׁר "whence"; H834b בַאֲשֶׁר "in which"; H3627 כְּלִי "article/utensil"; H6653 צְבָתִים "bundle"; H7039 קָלִי "roasted"; H2558 חֹמֶץ "vinegar"; H7872 שֵׂיבָה "greyheaded"; H7934 שָׁכֵן "neighboring"; H3943 לָפַת "to twist"; H2108 זוּלָה "exception"; H8252 שָׁקַט "to quiet"; H7387 רֵיקָם "emptily"; H3966 מְאֹד "much"; H7646 שָׂבֵעַ "to satisfy"; H3498 יָתַר "to remain"; H3637 כָּלַם "be humiliated" | way, road; (marks the definite object); from what; where; vessel; handfuls (of grain); roasted grain; sour wine; old age, grey hair; (f.) neighbour; to turn, bend over; besides, except; be quiet, rest; empty-handed; very; to eat one's fill; to have left over; to shame (Hiph.) | Ruth contexts, from memory (UNVERIFIED): 2:9 vessels and "from what they draw"; 1:16 "where you go"; 3:8 he turned or bent; 4:4 "none besides you"; 3:18 "will not rest"; 2:14 she ate her fill and had some left; 2:15 "do not shame her". The capital in "Way" reads as a title. |

The remaining rows (about 230) I judge fair for Ruth. I sampled BDB on these and found no conflict: שׁוּב (Ru 1:6, 22),
יָשַׁב aside, הָלַךְ (Ru 1:21), and the common nouns, numerals, pronouns and particles. I propose no change to כָּנָף
"wing": the wordplay between 2:12 and 3:9 works best if the gloss stays unexplained.

### C. Ketiv / qere (13 places)

| id | sev | lab | ref | current | proposed | source / reason |
|---|---|---|---|---|---|---|
| K1 | S | V | 3:3 וירדתי, 3:4 ושכבתי | ketiv parsed "1cs"; tagged "person, gender" | Parse: "-תי: 1cs form; also an older 2fs spelling". Tag: "ending -תי / -תְּ". | GKC §44h lists "Ru 3:3, 4" among 2fs perfects written with a final yod, and says the Masoretic vowels belong to the marginal reading (Wikisource URL above). The 1cs-only parse presupposes the reading "and I will go down". |
| K2 | m | V | 3:14 בטרום / בְּטֶרֶם | tagged "word", two vocab rows (H2958, H2962) | tag "spelling"; teach one word | BDB (Sefaria) טֶרֶם: "once (Ru 3:14 Kt) טְרוֹם". BDB treats it as a full spelling of the same adverb. |
| K3 | m | V | 3:14 qere | מַרְגְּלוֹתָיוֹ (holem on the final vav) | מַרְגְּלוֹתָיו | The stray holem is copied from the OSHB XML: `Ruth.xml` has `<rdg type="x-qere">…מַרְגְּלוֹתָי/וֹ֙`. A 3ms suffix on a plural noun has a silent vav, as at 3:4, 7, 8 in the same data. |
| K4 | m | V | 3:14 ketiv מרגלתו | fs singular, gloss "feet" | keep the parse; the gloss "place of his feet" (G6) suits it | BDB (Sefaria) cites "Kt מרגלתו" without calling it an error, so the singular parse is fair. |
| K5 | m | V | 2:1 ketiv מידע | Pual ptc., gloss "to know" | show "known one, acquaintance (Pual ptc. of יָדַע)" | BDB (Sefaria) יָדַע: "Pt. … as subst. = acquaintance … Kt מידע Ru 2:1 (Qr מוֹדַע)". The verb gloss reads oddly beside the noun "kinsman". |
| K6 | m | U | 4:5 קניתי / קָנִיתָה | 1cs vs 2ms | no change | The ketiv 1cs ("I acquire") is the plain reading. I know of no 2ms-in-ְתִּי theory parallel to K1, but have not checked. The tag is neutral. |
| K7 | – | V | 1:8, 3:3 (שמלתך), 3:5, 3:12, 3:17, 4:4, 4:6 | as packet | no change | The parses agree with BDB forms where I checked (for example לִגְאוֹל Ru 4:4; Qr forms). The tags are neutral and no wording calls either reading an error. |

### D. Names (30)

| id | sev | lab | row | current | proposed | source / reason |
|---|---|---|---|---|---|---|
| N1 | M | V | H673 אֶפְרָתִי (1:2) | Ephraimite | Ephrathite | BDB (Sefaria) אֶפְרָתִי: "from א׳ 2 [Ephrath]; … אֶפְרָתִים מִבֵּית לֶחֶם Ru 1:2". "Ephraimite" puts the family in the wrong tribe. |
| N2 | m | V | H8009 שַׂלְמָה (4:20) | Salmon | Salmah (= Salmon, 4:21) | The Hebrew spelling differs from שַׂלְמוֹן in 4:21. Showing the same English name hides that. |
| N3 | m | Q | H7706 שַׁדַּי (1:20, 21) | Almighty | Shaddai (trad. "Almighty") | BDB (Sefaria) calls it an archaism (Ru 1:20, 21), and its meaning is debated. From memory, the LXX of Ruth renders it ὁ ἱκανός ("the Sufficient", UNVERIFIED). |
| N4 | m | V | H672 אֶפְרָתָה | BDB def shown is a run-on note ("once (Psalm 132:6) perhaps for Ephraim; …") | "Ephrathah (Bethlehem)" | Display hygiene; same class as F3. |
| N5 | – | V | the other 26 | – | no change | Identifications and spellings are correct: Bethlehem, Boaz, David, Hezron, Judah, LORD, Jesse, Israel, Chilion, Leah, Moab, Moabite, Mahlon, Elimelech, Mara, Nahshon, Naomi, Obed, Amminadab, Orpah, Perez, Ruth, Rachel, Ram, Salmon (4:21), Tamar. |

## Counts

| severity | count | ids |
|---|---|---|
| MUST-FIX | 5 | F1, G1, G2, G3, N1 |
| SHOULD-FIX | 34 | F3, F5, G4–G34, K1 |
| MINOR | 20 | F2, F4, G35–G45, K2–K5, N2–N4 (K6, K7 and N5 need no action) |

By label, over all 62 rows: 53 VERIFIED, 4 QUESTIONABLE (G13, G33, G38, N3) and 5 UNVERIFIED (G40–G42, G45, K6). The
UNVERIFIED rows are all MINOR or no-action and rest on my knowledge of the Ruth contexts.

## Verdict

The book is **not ready to drill as-is**, but the fixes are small and local.

1. **F1 is a pipeline bug, not a content judgment.** בּוֹא (18×), בַּיִן and בָּחוּר are silently left out because Strong's
   numbers below 1000 that start with 9 are taken for affixes. Fix the test, for example `int(k[1:5]) >= 9000` or an
   explicit affix list. Then rebuild; the vocabulary becomes 288.
2. **Four glosses are plainly wrong for Ruth:** מָרַר "provoke", נָחַם "be sorry" (a Piel "comfort"), יֵשׁ "there" and
   אֶפְרָתִי "Ephraimite". Fix them through `pipeline/overrides/ruth.json` with the BDB citations above.
3. **The pattern behind most SHOULD-FIX rows** is that the first TBESH gloss is a general or Strong's-level sense, and
   Ruth uses another sense: glean, sit, bear, uncover, visit, happen, winnow, nurse, grow up. Each row above has a
   BDB sense that cites Ruth directly, so the overrides can quote it.
4. **On ketiv/qere** the app already stays neutral, except for K1: the 1cs parse of the 3:3 and 3:4 ketiv decides the
   reading. Suggested neutral wording for the sheet: *"Written ending ־תי: the usual 1cs ending, and also an older
   spelling of the 2fs ending (GKC §44h). Read ending ־תְּ: 2fs."*
5. **Names are sound** apart from Ephrathite.
