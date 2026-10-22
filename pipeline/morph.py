"""Decode OSHB morphology codes into readable English.

Tables follow "Hebrew Morphology Codes", Open Scriptures Hebrew Bible project
(https://hb.openscriptures.org/parsing/HebrewMorphologyCodes.html, CC BY 4.0), checked 2026-10-22.
Ordering per part of speech: A/N = type gender number state; P = type person gender number;
R = type; S = type person gender number; T = type; V = stem type person gender number,
except participles (stem type gender number state) and infinitives (stem type).
"""
from __future__ import annotations

STEMS = {
    "q": "Qal", "N": "Niphal", "p": "Piel", "P": "Pual", "h": "Hiphil", "H": "Hophal",
    "t": "Hithpael", "o": "Polel", "O": "Polal", "r": "Hithpolel", "m": "Poel", "M": "Poal",
    "k": "Palel", "K": "Pulal", "Q": "Qal passive", "l": "Pilpel", "L": "Polpal",
    "f": "Hithpalpel", "D": "Nithpael", "j": "Pealal", "i": "Pilel", "u": "Hothpaal",
    "c": "Tiphil", "v": "Hishtaphel", "w": "Nithpalel", "y": "Nithpoel", "z": "Hithpoel",
}
CONJ = {
    "p": "perfect (qatal)", "q": "sequential perfect (weqatal)", "i": "imperfect (yiqtol)",
    "w": "wayyiqtol", "h": "cohortative", "j": "jussive", "v": "imperative",
    "r": "participle active", "s": "participle passive",
    "a": "infinitive absolute", "c": "infinitive construct",
}
ADJ_TYPE = {"a": "adjective", "c": "cardinal number", "g": "gentilic adjective", "o": "ordinal number"}
NOUN_TYPE = {"c": "noun", "g": "gentilic noun", "p": "proper name"}
PRON_TYPE = {"d": "demonstrative pronoun", "f": "indefinite pronoun", "i": "interrogative pronoun",
             "p": "personal pronoun", "r": "relative pronoun"}
PART_TYPE = {"a": "particle of affirmation", "d": "definite article", "e": "particle of exhortation",
             "i": "interrogative particle", "j": "interjection", "m": "demonstrative particle",
             "n": "negative particle", "o": "direct object marker", "r": "relative particle"}
SUFF_TYPE = {"d": "directional he", "h": "paragogic he", "n": "paragogic nun", "p": "pronominal suffix"}
GENDER = {"b": "b", "c": "c", "f": "f", "m": "m"}  # both, common, feminine, masculine
NUMBER = {"d": "d", "p": "p", "s": "s"}  # dual, plural, singular
STATE = {"a": "absolute", "c": "construct", "d": "determined"}


class MorphError(ValueError):
    pass


def _get(table: dict, code: str, what: str, full: str) -> str:
    if code == "x":
        return ""
    if code not in table:
        raise MorphError(f"unknown {what} code {code!r} in {full!r}")
    return table[code]


def _pgn(person: str, gender: str, number: str, full: str) -> str:
    """Person-gender-number in the compact grammar-book form: '3ms', '2fs', '1cs', 'fp'."""
    parts = []
    if person == "x":
        person = ""
    if person:
        if person not in "123":
            raise MorphError(f"bad person {person!r} in {full!r}")
        parts.append(person)
    if gender:
        parts.append(_get(GENDER, gender, "gender", full))
    if number:
        parts.append(_get(NUMBER, number, "number", full))
    return "".join(parts)


def decode(code: str) -> dict:
    """Decode one segment code (no language prefix), e.g. 'Vqw3ms', 'Ncfsc', 'Sp3fs', 'R', 'Td'.

    Returns {pos, label, ...fields}. Raises MorphError on anything not in the OSHB tables.
    """
    if not code:
        raise MorphError("empty morph code")
    pos, rest = code[0], code[1:]
    full = code
    f: dict = {"pos": pos}
    if pos == "V":
        if len(rest) < 2:
            raise MorphError(f"short verb code {full!r}")
        f["stem"] = _get(STEMS, rest[0], "stem", full)
        f["conj"] = _get(CONJ, rest[1], "conjugation", full)
        tail = rest[2:]
        if rest[1] in "rs":  # participle: gender number state
            g, n, s = (tail + "   ")[:3]
            f["gender"], f["number"] = g.strip().replace("x", ""), n.strip().replace("x", "")
            f["state"] = _get(STATE, s, "state", full) if s.strip() else ""
            f["label"] = f"{f['stem']} {f['conj']}, {_pgn('', f['gender'], f['number'], full)} {f['state']}".strip()
        elif rest[1] in "ac":  # infinitive
            if tail:
                raise MorphError(f"unexpected infinitive tail in {full!r}")
            f["label"] = f"{f['stem']} {f['conj']}"
        else:
            p, g, n = (tail + "   ")[:3]
            f["person"], f["gender"], f["number"] = (p.strip().replace("x", ""), g.strip().replace("x", ""), n.strip().replace("x", ""))
            f["label"] = f"{f['stem']} {f['conj']}, {_pgn(f['person'], f['gender'], f['number'], full)}"
    elif pos in "NA":
        if not rest:
            raise MorphError(f"short code {full!r}")
        table = NOUN_TYPE if pos == "N" else ADJ_TYPE
        f["type"] = _get(table, rest[0], "type", full)
        g, n, s = (rest[1:] + "   ")[:3]
        f["gender"], f["number"] = g.strip().replace("x", ""), n.strip().replace("x", "")
        f["state"] = _get(STATE, s, "state", full) if s.strip() else ""
        pgn = _pgn("", f["gender"], f["number"], full)
        f["label"] = ", ".join(x for x in [f["type"], pgn, f["state"]] if x)
    elif pos == "P":
        f["type"] = _get(PRON_TYPE, rest[0], "type", full) if rest else "pronoun"
        p, g, n = (rest[1:] + "   ")[:3]
        f["person"], f["gender"], f["number"] = (p.strip().replace("x", ""), g.strip().replace("x", ""), n.strip().replace("x", ""))
        pgn = _pgn(f["person"], f["gender"], f["number"], full)
        f["label"] = ", ".join(x for x in [f["type"], pgn] if x)
    elif pos == "S":
        f["type"] = _get(SUFF_TYPE, rest[0], "suffix type", full) if rest else "suffix"
        p, g, n = (rest[1:] + "   ")[:3]
        f["person"], f["gender"], f["number"] = (p.strip().replace("x", ""), g.strip().replace("x", ""), n.strip().replace("x", ""))
        pgn = _pgn(f["person"], f["gender"], f["number"], full)
        f["label"] = ", ".join(x for x in [f["type"], pgn] if x)
    elif pos == "R":
        if rest and rest != "d":
            raise MorphError(f"bad preposition code {full!r}")
        f["label"] = "preposition + article" if rest == "d" else "preposition"
    elif pos == "T":
        f["type"] = _get(PART_TYPE, rest[0], "particle type", full) if rest else "particle"
        f["label"] = f["type"]
    elif pos == "C":
        f["label"] = "conjunction"
    elif pos == "D":
        f["label"] = "adverb"
    else:
        raise MorphError(f"unknown part of speech {pos!r} in {full!r}")
    return f


def split_language(full: str) -> tuple[str, list[str]]:
    """'HC/Vqw3ms' -> ('H', ['C', 'Vqw3ms'])."""
    if not full or full[0] not in "HA":
        raise MorphError(f"missing language prefix in {full!r}")
    return full[0], full[1:].split("/")
