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
    assert data["lexemes"]["H2428"]["tg"].startswith("strength")   # not the 'Helech' name row
    assert not data["lexemes"]["H2428"].get("name")


# ── regressions from the 2026-10-22 reviews (docs/review/content-A.md, content-B.md, code-1.md) ──

def test_strongs_numbers_starting_with_9_are_words_not_affixes(data):
    """H935 בּוֹא, H970 בָּחוּר and H996 בֵּין were mistaken for H9000+ affix rows."""
    for k in ("H935", "H970", "H996"):
        r = data["lexemes"][k]
        assert not r.get("affix") and r["bdb"]["page"] > 0, k
    assert data["lexemes"]["H9002"].get("affix")


def test_counts_are_per_place(data):
    L = data["lexemes"]
    assert L["H1035"]["n"] == 7          # Bethlehem: two words, counted once
    assert L["H8071"]["n"] == 1          # mantle: written + read in one place
    assert len(L["H8071"]["occ"]) == 2   # but both tokens are still listed


def test_merges_follow_bdb(data):
    L = data["lexemes"]
    assert "H3212" not in L and "H2958" not in L
    assert L["H1980"]["n"] == 18
    by_ref = {(e["ref"], tuple(e["diff"])) for e in data["kq"]}
    assert ("3.14", ("spelling",)) in by_ref   # בטרום / בְּטֶרֶם: one word in BDB


def test_every_override_carries_its_reason(data):
    for k, r in data["lexemes"].items():
        if "glossNote" in r:
            assert r["glossNote"]["why"] and r["glossNote"]["source"], k


def test_ruth3_written_ending_note_is_neutral(data):
    notes = {e["ref"]: e.get("note", "") for e in data["kq"] if e.get("note")}
    assert set(notes) == {"3.3", "3.4"}
    for n in notes.values():
        assert "first person" in n and "second feminine" in n and "GKC" in n


def test_suffix_on_infinitive_glossed_both_ways(data):
    toks = [t for v in data["verses"] if v["ref"] == "3.3" for t in v["t"]]
    sufs = [s for t in toks for s in t["segs"] if s.get("gl")]
    assert any(s["gl"] == "his / him" for s in sufs)


def test_name_kinds_and_glosses(data):
    L = data["lexemes"]
    assert L["H673"]["gloss"] == "Ephrathite"
    assert L["H672"]["kind"] == "place"


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


# ── English renderings (Steve, 2026-10-22: "a simple translation such as 'and she walked/went'") ──

def _en(data, ref):
    v = next(v for v in data["verses"] if v["ref"] == ref)
    return [t["en"] for t in v["t"]]


def test_rendering_simple_past_with_both_senses(data):
    assert "and she went / walked" in _en(data, "2.3")


def test_rendering_keeps_written_and_read_apart_at_3_3(data):
    en = _en(data, "3.3")
    assert "and I will go down" in en and "and you (f) will go down" in en


def test_rendering_follows_number_at_3_14(data):
    en = _en(data, "3.14")
    assert "his place of the foot" in en and "his place of the feet" in en


def test_rendering_keeps_2nd_person_gender(data):
    assert "with you (pl)" in _en(data, "1.8")        # masculine plural to two women: shown as written
    assert "return! (f pl)" in _en(data, "1.8")


def test_rendering_uses_stem_sense(data):
    assert "he made bitter" in _en(data, "1.20")       # Hiphil, not the Qal 'was bitter' of 1:13
    assert "he brought me back" in _en(data, "1.21")
    assert "he fathered" in _en(data, "4.18")


def test_rendering_ל_infinitive_and_participle_noun(data):
    assert "to sojourn" in _en(data, "1.1")
    assert "from our redeemer" in _en(data, "2.20")
    assert "who returned" in _en(data, "1.22")         # article on a finite verb


def test_every_token_has_a_rendering(data):
    for v in data["verses"]:
        for t in v["t"]:
            assert t.get("en"), (v["ref"], t["id"])


def test_lookalikes(data):
    L = data["lexemes"]
    assert "H408" in L["H413"]["alike"] and "H413" in L["H408"]["alike"]   # אֶל / אַל, same letters
    assert "אֵל" in L["H413"]["note"]["text"]                                 # God, not in Ruth


def test_english_units():
    from english import pluralize, senses, verb_forms
    assert pluralize("daughter-in-law") == "daughters-in-law"
    assert pluralize("young man") == "young men"
    assert pluralize("barley") == "barley"
    assert senses("to go, walk") == ["go", "walk"]
    assert senses("to(wards)") == ["to"]
    assert senses("to support; (ptc.) nurse", participle=True) == ["nurse"]
    assert verb_forms("lie")["ing"] == "lying" and verb_forms("dip")["past"] == "dipped"


def test_renderings_review_fixes(data):
    # docs/review/renderings-1.md: plural of a gloss ending in s, gentilic plurals, Niphal participle, כְּ + infinitive
    assert "witnesses" in _en(data, "4.9")
    assert "Ephrathites" in _en(data, "1.2")
    assert "the one stationed (over)" in _en(data, "2.5")
    assert "as their (f) coming (in)" in _en(data, "1.19")
    assert "today" in _en(data, "4.9")
    assert "it was bitter" in _en(data, "1.13")           # per-word override: impersonal


def test_he_and_she_are_separate_words(data):
    # Strong's files הִיא under הוּא H1931; for learning they are two words (Steve, 2026-10-23).
    L = data["lexemes"]
    assert L["H1931"]["he"] == "הוּא" and L["H1931f"]["he"] == "הִיא"
    assert (L["H1931"]["n"], L["H1931f"]["n"]) == (6, 5)
    for v in data["verses"]:
        for t in v["t"]:
            for s in t["segs"]:
                if s["x"] in ("H1931", "H1931f"):
                    assert s["m"][3] == ("f" if s["x"] == "H1931f" else "m"), t["id"]
