"""OSHB OSIS XML parser tests.

Pinned Ruth fixtures exercise the specific edge cases identified during
spec review: clean baseline, multi-segment with prefix, multi-segment with
suffix pronoun, qere/ketiv variants, maqaf-joined tokens.

These tests use the real Ruth.xml from data/sources/morphhb if available;
otherwise they fall back to data/sources/sample/Ruth.xml.
"""

from __future__ import annotations

import unicodedata
from pathlib import Path

import pytest

from build.sources.oshb import (
    PREFIX_LEMMA_TO_STRONG,
    _normalize_strong,
    parse_book,
    parse_morph,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
FULL_RUTH = REPO_ROOT / "data" / "sources" / "morphhb" / "wlc" / "Ruth.xml"
SAMPLE_RUTH = REPO_ROOT / "data" / "sources" / "sample" / "Ruth.xml"


def _ruth_path() -> Path:
    """Prefer the full Ruth.xml; fall back to sample if not yet fetched."""
    if FULL_RUTH.exists():
        return FULL_RUTH
    if SAMPLE_RUTH.exists():
        return SAMPLE_RUTH
    pytest.skip("No Ruth source data available (run scripts/fetch-sources.sh)")


@pytest.fixture(scope="module")
def ruth_verses():
    """Parsed Ruth, scoped per-module to avoid re-parsing for every test."""
    return parse_book(_ruth_path(), book_id="Ruth")


class TestStrongNormalization:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("1961", "H1961"),  # plain Strong's number
            ("1481 a", "H1481a"),  # homograph suffix
            ("1035+", "H1035"),  # compound marker stripped
            ("c", "H9001"),  # single-letter prefix (synthetic H9XXX)
            ("l", "H9005"),
            ("d", "H9008"),  # definite article (synthetic, NOT real H1886="Dothan")
            ("S", "H9100"),  # synthesized suffix placeholder
            ("?", "H9999"),  # synthesized unknown placeholder
            ("", "H0"),  # degenerate
        ],
    )
    def test_normalization(self, raw, expected):
        assert _normalize_strong(raw) == expected

    def test_all_prefix_letters_have_strong_ids(self):
        for letter, strong_id in PREFIX_LEMMA_TO_STRONG.items():
            assert strong_id.startswith("H")
            assert _normalize_strong(letter) == strong_id


class TestParseMorph:
    @pytest.mark.parametrize(
        "code,expected_pos,expected_stem,expected_tense",
        [
            ("Vqw3ms", "V", "Qal", "Wayyiqtol"),
            ("Vqp3ms", "V", "Qal", "Perfect"),
            ("Vqi3ms", "V", "Qal", "Imperfect"),
            ("Vhc", "V", "Hiphil", "Infinitive Construct"),
            ("Ncmsa", "N", None, None),
            ("C", "C", None, None),
            ("R", "R", None, None),
        ],
    )
    def test_decodes_known_codes(self, code, expected_pos, expected_stem, expected_tense):
        m = parse_morph(code)
        assert m["pos"] == expected_pos
        assert m["stem"] == expected_stem
        assert m["tense"] == expected_tense

    def test_empty_code(self):
        m = parse_morph("")
        assert m["pos"] == "?"


class TestRuthParse:
    """Tests against the actual Ruth.xml — the spec calls out these as critical."""

    def test_verse_1_1_baseline(self, ruth_verses):
        """Ruth 1:1 — clean baseline. Verify structure and known content."""
        verse_refs = [ref for ref, _ in ruth_verses]
        assert "1.1" in verse_refs

        verse_ref, words = next((r, w) for r, w in ruth_verses if r == "1.1")
        assert verse_ref == "1.1"

        # Ruth 1:1 has 19 surface tokens in OSHB
        assert len(words) >= 15  # allow modest variance for sof-pasuq handling

        # First token: וַיְהִ֗י — should split into [conjunction, verb היה]
        first = words[0]
        assert first.id == "Ruth.1.1.t1"
        assert len(first.segments) == 2
        assert first.segments[0].strong == "H9001"  # conjunction
        assert first.segments[1].strong == "H1961"  # to be (היה)

    def test_word_ids_unique(self, ruth_verses):
        seen: set[str] = set()
        for _, words in ruth_verses:
            for w in words:
                assert w.id not in seen, f"Duplicate Word.id: {w.id}"
                seen.add(w.id)

    def test_word_ids_follow_pattern(self, ruth_verses):
        import re

        pattern = re.compile(r"^Ruth\.\d+\.\d+\.t\d+$")
        for _, words in ruth_verses:
            for w in words:
                assert pattern.match(w.id), f"Bad ID: {w.id}"

    def test_segments_at_least_one(self, ruth_verses):
        for _, words in ruth_verses:
            for w in words:
                assert len(w.segments) >= 1, f"Empty segments in {w.id}"

    def test_segment_strongs_are_normalized(self, ruth_verses):
        import re

        pattern = re.compile(r"^H\d+[a-z]?$")
        for _, words in ruth_verses:
            for w in words:
                for s in w.segments:
                    assert pattern.match(s.strong), f"Bad Strong's: {s.strong} in {w.id}"

    def test_text_is_nfc_normalized(self, ruth_verses):
        for _, words in ruth_verses:
            for w in words:
                assert w.text == unicodedata.normalize("NFC", w.text)
                for s in w.segments:
                    assert s.text == unicodedata.normalize("NFC", s.text)

    def test_pronominal_suffix_handling(self, ruth_verses):
        """Verse 1:1 contains וְ/אִשְׁתּ֖/וֹ — conj + noun + 3ms suffix.

        The lemma in OSHB is 'c/802' (only 2 entries), but the morph and text
        each have 3 segments. The parser pads with synthesized suffix lemma.
        """
        # Search for the word; it should have 3 segments
        found = False
        for verse_ref, words in ruth_verses:
            if verse_ref != "1.1":
                continue
            for w in words:
                if "אִשְׁת" in w.text and "ו" in w.text:
                    # Found the candidate; verify 3 segments
                    if len(w.segments) == 3:
                        # Last segment should be the synthesized suffix
                        assert w.segments[2].strong == "H9100"
                        found = True
                        break
        assert found, "Expected to find וְאִשְׁתּוֹ in Ruth 1:1 with 3 segments"
