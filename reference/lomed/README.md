# Notes on `lomed` (C:\Users\steve\claude-here\lomed)

Surveyed 2026-10-22 so future sessions need not re-examine that folder.

**Standing rule from Steve:** lomed is an adjacent, earlier project (a "reading-first" Ruth reader: Python build
pipeline → static Alpine.js PWA). Draw on it for **resources and technical approaches only**. Do **not** take
direction from it on purpose, scope, features or UX for hebrew-by-book. Its spec, CONTEXT.md, backlog and personas
were deliberately not mined for design.

Nothing here counts as verified (review covenant). Findings below are labelled.

## What lomed is, technically

- `build/` (Python ≥3.11, lxml, pydantic): `sources/oshb.py` parses OSHB OSIS XML into words → segments (prefix /
  stem / suffix split on `/`); `sources/strongs.py` takes a one-line gloss from OpenScriptures Strong's XML;
  `sources/frequency.py` counts per-lemma occurrences in the book; `pipeline.py` merges these into `app/data/ruth.json`
  (85 verses, every segment carrying gloss, Strong's id, decoded morph, book frequency) plus a `lemma_index`.
- `app/`: Alpine.js reader with long-press gesture tracker, a service worker, Hebrew font CSS.
- Tests: pytest on the parser/schema, `node --test` on two JS modules. CI: GitHub Actions (ci.yml, deploy.yml).

## Copied into this project (verbatim, minimal)

| Here | From lomed | Why |
| --- | --- | --- |
| `data/sources/oshb/Ruth.xml` | `data/sources/morphhb/wlc/Ruth.xml` | OSHB Ruth (WLC 4.20 + full morphology, header dated 2017.12.10). CC BY 4.0 — attribution required. SHA-256 `fb6a2660…f0a11e`. **Provenance UNVERIFIED:** lomed's copy is not a git clone and its built JSON records `commit_sha: "unknown"`, so the pin `3d15126f…` (2024-08-27) was never actually applied. Re-fetch at a pinned commit and diff before relying on it. |
| `reference/lomed/oshb.py` + `test_oshb.py` | `build/sources/oshb.py`, `tests/build/test_oshb.py` | Starting point for our parser: segment splitting, clitic-prefix pseudo-lemmas (b c d i k l m s → synthetic H900x ids), homograph suffixes (`"1481 a"` → `H1481a`), `+` compound marker, pronominal-suffix padding, NFC normalisation. **Has verified defects — see below. Do not use as is.** |
| `reference/lomed/fetch-sources.sh` | `scripts/fetch-sources.sh` | Pattern: clone morphhb + strongs at pinned SHAs and assert HEAD == pin. |
| `reference/lomed/compute-cache-version.sh` + `sw.js` | same | Content-hash cache version substituted into the service worker at deploy (ignoring build timestamps), cache-first shell, "update ready" flow. Directly addresses josie-stats' banked problem: GitHub Pages serves JS with max-age=600, so a fresh index.html can pair with a stale module. |

Not copied (available in lomed if ever needed): OpenScriptures Strong's Hebrew XML (6.4 MB; CC BY 4.0 per lomed's
ATTRIBUTION.md, "public domain" per its CONTEXT.md — inconsistent, re-check) — useful only for transliteration and
as a shallow fallback gloss; the long-press gesture tracker `app/js/reader.js` (multi-touch-safe; trivial to rewrite);
pydantic schema; Alpine (we use vanilla ES modules like josie-stats).

## Defects found in lomed's parser (VERIFIED against lomed's own built output and the OSHB data)

1. **Qere dropped, ketiv kept.** The parser iterates only `<w>` children of `<verse>`; OSHB puts the qere inside
   `<note type="variant"><rdg type="x-qere"><w…>`. Result in lomed's `ruth.json`: 11 ketiv, 0 qere — e.g. Ruth 2:1
   shows unpointed ketiv מידע instead of qere מוֹדַע; 3:4 shows יעשה instead of יַעַשׂ. Its docstring claims the opposite.
   Corrected inventory (computed 2026-10-22 by walking the XML; an earlier "11 pairs" statement was wrong): **13 places**
   = 10 ketiv/qere pairs (1:8, 2:1, 3:3 ×2, 3:4, 3:14 ×2, 4:4, 4:5, 4:6) + 1 **ketiv without qere** (3:12 אם, written
   but not read) + 2 **qere without ketiv** (אֵלַי, 3:5 and 3:17), which lomed omits entirely. Several pairs differ in
   person/number or even lemma: 3:3 וירדתי and 3:4 ושכבתי (ketiv 1cs, qere 2fs); 4:5 קניתי (ketiv 1cs, qere 2ms);
   3:3 שמלתך and 3:14 מרגלתו (ketiv sg, qere pl); 2:1 מידע H3045 vs מוֹדַע H4129; 3:14 בטרום H2958 vs בְּטֶרֶם H2962.
   (The raw `x-qere` attribute count of 13 vs 12 qere words found is unexplained — check when writing the parser.) Our parser must read `rdg[@type='x-qere']` and carry **both** readings as first-class data (Steve,
   2026-10-22: "Ketiv and qere are both important for Ruth. Some qere are helpful corrections; in other places, the
   ketiv provides important information."). Neither may be discarded or demoted to a footnote.
2. **Participles mis-decoded.** `parse_morph` assumes a person slot after the conjugation letter. For participles
   (`Vqrmpa`) there is none, so lomed outputs gender=P, number=A (1:1 שֹּׁפְטִים, 1:8, 1:18, 2:1). Infinitives are fine
   only by accident of length.
3. **Wrong/missing stem names.** Per OSHB's code table (https://hb.openscriptures.org/parsing/HebrewMorphologyCodes.html,
   fetched 2026-10-22): `v` = hishtaphel (lomed says Polel — Ruth 2:10 תִּשְׁתַּחוּ is mislabelled), `f` = hithpalpel (lomed
   says Pilpel), `l` = pilpel (unmapped; occurs once in Ruth). Of 27 Hebrew stem codes lomed maps 9. Stems occurring in
   Ruth's verbs: q 341, h 31, p 28, N 12, H 2, P 2, l 1, t 1, v 1 (counted from Ruth.xml segments).
4. Suffix codes (`Sp3ms`: type, person, gender, number) and noun/adjective type letters are not decoded.
5. `strongs.lookup_for` silently falls back from a homograph (`H1481a`) to the base entry, and to `"?"` on a miss —
   silent-wrong glosses. Ours should fail loudly in the build and list misses.

Useful counts from Ruth.xml (computed 2026-10-22, not yet independently re-checked): 85 verses, 1,119 `<w>` tokens
(direct children plus qere), 177 maqqef joins.

## Facts about Steve's setup learned from lomed

- His phone is a **Motorola (Android)**; lomed flagged "test SBL Hebrew + niqqud + te'amim on the actual Motorola" as a
  first-task risk. Same applies here.
- SBL Hebrew requires manual download and acceptance of SBL's terms; lomed never vendored it. Prefer an OFL font
  (Ezra SIL, Noto Serif Hebrew) so the repo can carry it.
- Other sources lomed had banked as candidates (licences unchecked here): BHSA via Text-Fabric (ETCBC), Berean
  interlinear glosses, MACULA Hebrew (CC BY 4.0), Cherith glosses.
