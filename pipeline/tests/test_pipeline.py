"""Pipeline tests. Run: python -m pytest pipeline/tests -q   (needs python pipeline/fetch_sources.py first)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build import build, kq_differences  # noqa: E402
from hebrew import consonantal, pointed  # noqa: E402
from morph import MorphError, decode  # noqa: E402
from oshb import lemma_key, parse_book  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RUTH = ROOT / "data" / "sources" / "oshb" / "Ruth.xml"


# ── morphology (tables from hb.openscriptures.org/parsing/HebrewMorphologyCodes.html) ──

@pytest.mark.parametrize("code,label", [
    ("Vqw3ms", "Qal wayyiqtol, 3ms"),
    ("Vqrmpa", "Qal participle active, mp absolute"),      # participles: no person slot
    ("VPsmsa", "Pual participle passive, ms absolute"),
    ("Vqc", "Qal infinitive construct"),
    ("Vvw3fs", "Hishtaphel wayyiqtol, 3fs"),               # v = hishtaphel (not Polel)
    ("Vlp3ms", "Pilpel perfect (qatal), 3ms"),             # l = pilpel
    ("Vfp3ms", "Hithpalpel perfect (qatal), 3ms"),         # f = hithpalpel
    ("Ncfsc", "noun, fs, construct"),
    ("Np", "proper name"),
    ("Sp3fs", "pronominal suffix, 3fs"),
    ("Pdxfs", "demonstrative pronoun, fs"),                # x = placeholder
    ("Rd", "preposition + article"),
    ("To", "direct object marker"),
])
def test_decode_labels(code, label):
    assert decode(code)["label"] == label


def test_participle_fields_not_shifted():
    f = decode("Vqrmpa")
    assert (f["gender"], f["number"], f["state"]) == ("m", "p", "absolute")
    assert "person" not in f


@pytest.mark.parametrize("bad", ["Vzz3ms", "Xab", "Rq", ""])
def test_decode_rejects_unknown(bad):
    with pytest.raises(MorphError):
        decode(bad)


# ── text normalisation ──

def test_pointed_strips_cantillation_keeps_vowels():
    assert pointed("וַיְהִ֗י") == "וַיְהִי"
    assert pointed("אִמָּ֑/הּ") == "אִמָּהּ"


def test_consonantal():
    assert consonantal("וַיְהִ֗י") == "ויהי"
    assert consonantal("שִׂמְלֹתַ֛יִ/ךְ") == "שמלתיך"


def test_lemma_keys():
    assert lemma_key("6213 a") == "H6213a"
    assert lemma_key("1035+") == "H1035"
    assert lemma_key("c") == "H9002"


# ── OSHB Ruth: ketiv and qere are both first-class ──

@pytest.fixture(scope="module")
def ruth():
    if not RUTH.exists():
        pytest.skip("run python pipeline/fetch_sources.py first")
    return parse_book(RUTH, "Ruth")


def tokens(book):
    return [t for v in book["verses"] for t in v["tokens"]]


def test_shape(ruth):
    assert len(ruth["verses"]) == 85
    assert [v["ref"] for v in ruth["verses"]][:2] == ["1.1", "1.2"]


def test_kq_inventory(ruth):
    places = [(e["ref"], e["k"] is not None, len(e["q"])) for e in ruth["kq"]]
    assert len(places) == 13
    assert ("3.12", True, 0) in places          # written, not read
    assert ("3.5", False, 1) in places          # read, not written
    assert ("3.17", False, 1) in places
    assert sum(1 for _, k, q in places if k and q) == 10


def test_ruth3_ketiv_first_person(ruth):
    """Canonical scenario CS-1: the ketiv of 3:3 and 3:4 is first person in OSHB's tagging."""
    t = {x["id"]: x for x in tokens(ruth)}
    for ref, ketiv_parse, qere_parse in [
        ("3.3", "conjunction + Qal sequential perfect (weqatal), 1cs", "conjunction + Qal sequential perfect (weqatal), 2fs"),
        ("3.4", "conjunction + Qal sequential perfect (weqatal), 1cs", "conjunction + Qal sequential perfect (weqatal), 2fs"),
    ]:
        pairs = [e for e in ruth["kq"] if e["ref"] == ref and e["k"] and t[e["k"]]["parse"] == ketiv_parse]
        assert len(pairs) == 1, ref
        assert t[pairs[0]["q"][0]]["parse"] == qere_parse


def test_ruth3_14_feet_number(ruth):
    t = {x["id"]: x for x in tokens(ruth)}
    e = next(e for e in ruth["kq"] if e["ref"] == "3.14" and e["k"] and t[e["k"]]["lex"] == "H4772")
    assert "noun, fs, construct" in t[e["k"]]["parse"]
    assert "noun, fp, construct" in t[e["q"][0]]["parse"]


def test_ketiv_is_unpointed_and_qere_pointed(ruth):
    t = {x["id"]: x for x in tokens(ruth)}
    k = next(x for x in tokens(ruth) if x["ref"] == "2.1" and x.get("kq") == "k")
    q = t[k["pair"][0]]
    assert k["p"] == k["c"] == "מידע"
    assert q["p"] == "מוֹדַע" and q["lex"] == "H4129" and k["lex"] == "H3045"


def test_hishtaphel_2_10(ruth):
    hit = [x for x in tokens(ruth) if x["ref"] == "2.10" and "Hishtaphel" in x["parse"]]
    assert len(hit) == 1


def test_bethlehem_compound(ruth):
    v = next(v for v in ruth["verses"] if v["ref"] == "1.1")
    assert [x["lex"] for x in v["tokens"]].count("H1035") == 2


# ── full build ──

@pytest.fixture(scope="module")
def data():
    if not RUTH.exists():
        pytest.skip("run python pipeline/fetch_sources.py first")
    return build("Ruth")


def test_every_lexeme_has_gloss_and_bdb(data):
    for k, r in data["lexemes"].items():
        assert r["gloss"] and r["gloss"] != "?", k
        if not r.get("affix"):
            assert r["bdb"]["page"] > 0, k


def test_names_from_oshb(data):
    names = {r["gloss"] for r in data["lexemes"].values() if r.get("name")}
    assert {"Ruth", "Naomi", "Boaz", "Moab", "Bethlehem"} <= names
    assert data["lexemes"]["H2428"]["gloss"] == "strength"   # not the 'Helech' name row
    assert not data["lexemes"]["H2428"].get("name")


def test_kq_differences_are_neutral(data):
    by_ref = {}
    for e in data["kq"]:
        by_ref.setdefault(e["ref"], []).append(e["diff"])
    assert ["person", "gender"] in by_ref["3.3"]
    assert by_ref["4.5"] == [["person", "gender"]]
    assert by_ref["3.12"] == [["written, not read"]]
    assert by_ref["3.5"] == [["read, not written"]]
    assert by_ref["4.6"] == [["spelling"]]
    words = {w for diffs in by_ref.values() for d in diffs for w in d}
    assert not words & {"error", "correction", "corrected", "mistake"}


def test_kq_differences_unit():
    assert kq_differences(None, [{}]) == ["read, not written"]
