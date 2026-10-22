"""Parser for the Open Scriptures Hebrew Bible OSIS XML format.

OSHB encodes Hebrew text with morphology in OSIS XML. Each `<w>` element
represents one surface token, but a token may contain multiple lexical
segments (e.g., conjunctive `wᵊ-` + verb), separated by `/` in the lemma,
morph, and text attributes/content.

This parser converts an OSIS book file into a list of WordIR records that
the pipeline orchestrator merges with lexicon data and frequency counts.

OSHB peculiarities handled:

- **Slash-separated segments** in `lemma`, `morph`, and the text content.
  Counts must match across the three.
- **Morph prefix `H`** indicating Hebrew (vs Aramaic `A`); stripped.
- **Homograph suffixes** in the lemma (e.g., `"1481 a"`); preserved as the
  `lex` field, normalized to `H<num><letter>` for the `strong` field.
- **Compound markers** like `"1035+"` indicating "joined to next word"
  (e.g., compound place names). The `+` is preserved in `lex`, stripped
  for the `strong` lookup.
- **`<seg type="x-sof-pasuq">`** end-of-verse markers — ignored.
- **Qere/Ketiv** pairs (`<w type="x-ketiv">` siblings) — variant field set
  accordingly. Qere is canonical in the reading flow.
"""

from __future__ import annotations

import logging
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from lxml import etree

logger = logging.getLogger(__name__)

OSIS_NS = "http://www.bibletechnologies.net/2003/OSIS/namespace"
NS = {"o": OSIS_NS}


@dataclass(frozen=True)
class SegmentIR:
    """Intermediate representation of one segment, before glosses/freq are merged."""

    text: str
    lex: str  # OSHB lemma string, e.g. "1961" or "1481 a" or "1035+"
    strong: str  # Normalized: "H1961", "H1481a", "H1035"
    morph_raw: str  # Per-segment OSIS morph code, e.g. "Vqw3ms"


@dataclass(frozen=True)
class WordIR:
    """Intermediate representation of one surface token from OSHB."""

    id: str  # "Ruth.1.1.t1"
    text: str  # full surface form (pointed)
    variant: Literal["none", "qere", "ketiv"]
    segments: list[SegmentIR]


# Map single-letter prefix lemmas (used by OSHB for clitic prefixes) to
# their explicit Strong's IDs. These letters only ever appear as the FIRST
# segment of a multi-segment word.
#
# OSHB encodes clitic prefixes as single-letter pseudo-lemmas (b, c, d, i, k,
# l, m, s) — these are NOT real Strong's IDs. We map them to synthetic IDs
# in the H9000-range to avoid collision with real Strong's numbers (H1886
# is "Dothan", not "the"; H4480 IS "from", but we use synthetic for
# consistency across all clitic prefixes).
#
# All H9000-range IDs must have entries in FALLBACK_GLOSSES.
#
PREFIX_LEMMA_TO_STRONG = {
    "b": "H9003",  # preposition בְּ "in"
    "c": "H9001",  # conjunction וְ "and"
    "d": "H9008",  # definite article הַ "the"
    "i": "H9010",  # interrogative הֲ
    "k": "H9004",  # preposition כְּ "as"
    "l": "H9005",  # preposition לְ "to"
    "m": "H9006",  # preposition מִן "from"
    "s": "H9007",  # relative שֶׁ "that / which"
    "S": "H9100",  # synthesized: pronominal suffix (no explicit lemma in OSHB)
    "?": "H9999",  # synthesized: malformed/unknown segment placeholder
}

# OSHB places non-Strong's grammatical particles in the H9000+ range; if our
# Strong's lexicon doesn't have those entries, glossing falls back to a
# hardcoded gloss table (see strongs.py FALLBACK_GLOSSES).


def parse_book(xml_path: Path, book_id: str) -> list[tuple[str, list[WordIR]]]:
    """Parse one OSHB book file into a list of (verse_ref, [WordIR, ...]).

    Args:
        xml_path: path to the OSHB OSIS XML file (e.g. `wlc/Ruth.xml`).
        book_id: book identifier as used by OSHB osisID (e.g. `"Ruth"`).

    Returns:
        List of (verse_ref, words) where verse_ref is `"<chapter>.<verse>"`
        and `words` is a list of WordIR.
    """
    tree = etree.parse(str(xml_path))
    root = tree.getroot()

    verses_out: list[tuple[str, list[WordIR]]] = []

    for verse in root.iterfind(".//o:verse", namespaces=NS):
        osis_id = verse.get("osisID")
        if not osis_id:
            continue
        # osisID is "Book.Chapter.Verse"
        parts = osis_id.split(".")
        if len(parts) != 3 or parts[0] != book_id:
            continue
        verse_ref = f"{parts[1]}.{parts[2]}"

        words: list[WordIR] = []
        token_idx = 0
        for w_elem in verse.iterfind("o:w", namespaces=NS):
            token_idx += 1
            word_ir = _parse_w_element(
                w_elem,
                word_id=f"{book_id}.{verse_ref}.t{token_idx}",
            )
            if word_ir is not None:
                words.append(word_ir)

        if not words:
            logger.warning("verse %s.%s has no words (empty after parse)", book_id, verse_ref)

        verses_out.append((verse_ref, words))

    return verses_out


def _parse_w_element(w_elem, word_id: str) -> WordIR | None:
    """Convert one OSIS `<w>` element to a WordIR.

    Returns None if the element is malformed beyond recovery (logged but
    not raised — keeps a single bad token from killing a whole build).
    """
    raw_lemma = (w_elem.get("lemma") or "").strip()
    raw_morph = (w_elem.get("morph") or "").strip()
    text_full = "".join(w_elem.itertext()).strip()

    if not raw_lemma or not text_full:
        logger.warning(
            "skipping malformed <w> in %s: lemma=%r text=%r",
            word_id,
            raw_lemma,
            text_full,
        )
        return None

    morph_codes = _strip_language_prefix(raw_morph)
    lemma_segs, morph_segs, text_segs = _split_segments(
        raw_lemma, morph_codes, text_full, word_id, raw_morph=raw_morph
    )

    segments = [
        SegmentIR(
            text=unicodedata.normalize("NFC", text),
            lex=lex_raw.strip(),
            strong=_normalize_strong(lex_raw.strip()),
            morph_raw=morph_raw.strip(),
        )
        for lex_raw, morph_raw, text in zip(lemma_segs, morph_segs, text_segs, strict=False)
    ]
    if not segments:
        return None

    return WordIR(
        id=word_id,
        text=unicodedata.normalize("NFC", text_full.replace("/", "")),
        variant=_detect_variant(w_elem),
        segments=segments,
    )


def _strip_language_prefix(raw_morph: str) -> str:
    """Strip leading 'H' (Hebrew) or 'A' (Aramaic) language indicator from morph."""
    if raw_morph.startswith(("H", "A")):
        return raw_morph[1:]
    return raw_morph


def _split_segments(
    raw_lemma: str,
    morph_codes: str,
    text_full: str,
    word_id: str,
    *,
    raw_morph: str,
) -> tuple[list[str], list[str], list[str]]:
    """Split lemma/morph/text on '/' and reconcile their segment counts.

    OSHB tokens may have multiple lexical segments (e.g., conjunctive prefix
    + verb), encoded as '/'-separated values. The three lists must have equal
    length; this function applies the OSHB conventions to make that true,
    and falls back to a single '?' segment if the source is malformed.
    """
    lemma_segs = raw_lemma.split("/")
    morph_segs = morph_codes.split("/") if morph_codes else [""] * len(lemma_segs)
    text_segs = text_full.split("/")

    # OSHB convention: pronominal suffixes (morph "S...") have no entry in
    # the lemma string. Pad with synthesized "S" placeholders, which
    # `_normalize_strong` maps to H9100.
    while len(lemma_segs) < len(morph_segs) and morph_segs[len(lemma_segs)].startswith("S"):
        lemma_segs.append("S")

    if len(lemma_segs) == len(morph_segs) == len(text_segs):
        return lemma_segs, morph_segs, text_segs

    # Counts still don't match — log and fall back to a single coarse segment
    # so one malformed word doesn't kill the whole build.
    logger.warning(
        "segment-count mismatch in %s: lemma=%r morph=%r text=%r — "
        "falling back to single '?' segment",
        word_id,
        raw_lemma,
        raw_morph,
        text_full,
    )
    return ["?"], [morph_codes], [text_full.replace("/", "")]


def _detect_variant(w_elem) -> Literal["none", "qere", "ketiv"]:
    """Read OSHB type attribute to detect qere/ketiv markup."""
    type_attr = (w_elem.get("type") or "").lower()
    if "x-qere" in type_attr:
        return "qere"
    if "x-ketiv" in type_attr:
        return "ketiv"
    return "none"


def _normalize_strong(lemma_raw: str) -> str:
    """Normalize an OSHB lemma string into a stable Strong's ID.

    Examples:
        "1961"      -> "H1961"
        "1481 a"    -> "H1481a"
        "1035+"     -> "H1035"
        "c"         -> "H9001"  (single-letter prefix lemma)
        ""          -> "H0"     (degenerate; should not occur in practice)
    """
    if not lemma_raw:
        return "H0"

    # Compound marker `+` indicates this lemma joins with next word; strip
    # it for the Strong's ID itself (not meaningful for lookup or storage key).
    cleaned = lemma_raw.rstrip("+").strip()

    if cleaned in PREFIX_LEMMA_TO_STRONG:
        return PREFIX_LEMMA_TO_STRONG[cleaned]

    # Homograph suffix: "1481 a" -> base="1481", suffix="a"
    if " " in cleaned:
        base, suffix = cleaned.split(" ", 1)
        suffix = suffix.strip().lower()
        return f"H{base}{suffix}"

    return f"H{cleaned}"


def parse_morph(morph_raw: str) -> dict[str, str | int | None]:
    """Decode an OSIS morph code into structured fields.

    Returns a dict with keys: pos, stem, tense, person, gender, number, state.
    Best-effort; unrecognized codes leave fields as None.

    Examples:
        "Vqw3ms" -> verb Qal Wayyiqtol 3ms
        "C"      -> conjunction
        "Ncmsa"  -> noun common masculine singular absolute
    """
    fields: dict[str, str | int | None] = {
        "pos": "",
        "stem": None,
        "tense": None,
        "person": None,
        "gender": None,
        "number": None,
        "state": None,
    }

    if not morph_raw:
        fields["pos"] = "?"
        return fields

    pos_letter = morph_raw[0]
    fields["pos"] = pos_letter
    rest = morph_raw[1:]

    if pos_letter == "V":
        # Verb: V<stem><tense><person><gender><number>
        # Stems: q=Qal, N=Niphal, p=Piel, P=Pual, h=Hiphil, H=Hophal, t=Hitpael, etc.
        if len(rest) >= 1:
            fields["stem"] = _STEM_NAMES.get(rest[0], rest[0])
        if len(rest) >= 2:
            fields["tense"] = _TENSE_NAMES.get(rest[1], rest[1])
        if len(rest) >= 3 and rest[2].isdigit():
            fields["person"] = int(rest[2])
        if len(rest) >= 4:
            fields["gender"] = rest[3].upper()
        if len(rest) >= 5:
            fields["number"] = rest[4].upper()
    elif pos_letter == "N":
        # Noun: N<type><gender><number><state>
        # Type: c=common, p=proper, etc.
        if len(rest) >= 2:
            fields["gender"] = rest[1].upper()
        if len(rest) >= 3:
            fields["number"] = rest[2].upper()
        if len(rest) >= 4:
            fields["state"] = _STATE_NAMES.get(rest[3], rest[3])
    elif pos_letter == "A":
        # Adjective: A<type><gender><number><state>
        if len(rest) >= 2:
            fields["gender"] = rest[1].upper()
        if len(rest) >= 3:
            fields["number"] = rest[2].upper()
        if len(rest) >= 4:
            fields["state"] = _STATE_NAMES.get(rest[3], rest[3])
    elif pos_letter == "P":
        # Pronoun: P<type><person><gender><number>
        if len(rest) >= 2 and rest[1].isdigit():
            fields["person"] = int(rest[1])
        if len(rest) >= 3:
            fields["gender"] = rest[2].upper()
        if len(rest) >= 4:
            fields["number"] = rest[3].upper()
    # C (conjunction), R (preposition), T (particle), S (suffix), D (adverb)
    # have minimal additional structure; leave as just pos.

    return fields


_STEM_NAMES = {
    "q": "Qal",
    "N": "Niphal",
    "p": "Piel",
    "P": "Pual",
    "h": "Hiphil",
    "H": "Hophal",
    "t": "Hitpael",
    "v": "Polel",
    "f": "Pilpel",
}

_TENSE_NAMES = {
    "p": "Perfect",
    "q": "Sequential Perfect",
    "i": "Imperfect",
    "w": "Wayyiqtol",
    "h": "Cohortative",
    "j": "Jussive",
    "v": "Imperative",
    "r": "Participle",
    "s": "Passive Participle",
    "a": "Infinitive Absolute",
    "c": "Infinitive Construct",
}

_STATE_NAMES = {
    "a": "absolute",
    "c": "construct",
    "d": "determined",
}
