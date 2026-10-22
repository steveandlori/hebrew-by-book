"""Hebrew text normalisation for display and comparison.

Three renderings of a word are produced from the WLC text:
- pointed: consonants + vowel points (niqqud), dagesh, shin/sin dots; cantillation and meteg removed.
- consonantal: consonants only (what an unpointed scroll shows); maqqef kept.
- the original (with cantillation) is not shipped.
"""
from __future__ import annotations

import unicodedata

CGJ = "͏"  # combining grapheme joiner, used in WLC to keep marks in order
MAQQEF = "־"
SOF_PASUQ = "׃"

# Cantillation accents U+0591..U+05AF, meteg U+05BD, paseq U+05C0, upper/lower dots U+05C4/U+05C5.
_CANTILLATION = {chr(c) for c in range(0x0591, 0x05B0)} | {"ֽ", "׀", "ׄ", "ׅ", CGJ}
# Pointing: vowels and dagesh U+05B0..U+05BC, rafe U+05BF, shin/sin dots U+05C1/U+05C2, qamats qatan U+05C7.
_POINTS = {chr(c) for c in range(0x05B0, 0x05BD)} | {"ֿ", "ׁ", "ׂ", "ׇ"}


def pointed(text: str) -> str:
    """Strip cantillation (and meteg, CGJ, segment slashes); keep vowel points."""
    out = "".join(ch for ch in text.replace("/", "") if ch not in _CANTILLATION)
    return unicodedata.normalize("NFC", out)


def consonantal(text: str) -> str:
    """Consonants only: strip cantillation and all pointing."""
    return "".join(ch for ch in pointed(text) if ch not in _POINTS)
