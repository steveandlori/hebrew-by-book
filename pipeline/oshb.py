"""Parse an OSHB OSIS book file into verses of tokens, keeping ketiv AND qere as first-class tokens.

OSHB layout inside <verse>:
  <w lemma morph id>text</w>                    an ordinary word; '/' separates prefix / main / suffix segments
  <w type="x-ketiv" ...>KTV</w>                  the written form (unpointed in WLC)
  <note type="variant"><catchWord>KTV</catchWord><rdg type="x-qere"><w ...>QRE</w></rdg></note>
                                                 the read form, pointed; an empty <rdg/> = written but not read
  <note type="variant"><rdg type="x-qere"><w>..</w></rdg></note>   (no catchWord) = read but not written
  <seg type="x-maqqef">, <seg type="x-sof-pasuq">, <seg type="x-paseq">, <seg type="x-pe">  punctuation/markers
  <note n="..">                                 textual notes of the WLC: ignored

Every failure to line up lemma / morph / text segments raises; nothing is silently replaced.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

from hebrew import consonantal, pointed
from morph import MorphError, decode, split_language

NS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"

# OSHB clitic pseudo-lemmas -> TBESH extended Strong's numbers (TBESH rows H9002..H9009).
PREFIX_KEYS = {"c": "H9002", "b": "H9003", "k": "H9004", "l": "H9005", "m": "H9006",
               "s": "H9007", "i": "H9008", "d": "H9009"}
# Pronominal suffixes -> TBESH rows H9020..H9039: P = possessive (on nouns/adjectives), O = object (elsewhere).
_PS = ["1cs", "2ms", "2fs", "3ms", "3fs", "1cp", "2mp", "2fp", "3mp", "3fp"]
SUFFIX_KEYS = {**{("P", pgn): f"H{9020 + i}" for i, pgn in enumerate(_PS)},
               **{("O", pgn): f"H{9030 + i}" for i, pgn in enumerate(_PS)}}
OTHER_SUFFIX_KEYS = {"d": "H9011", "h": "H9012", "n": "H9013"}  # directional he, paragogic he, paragogic nun


class ParseError(ValueError):
    pass


def lemma_key(lemma: str) -> str:
    """'6213 a' -> 'H6213a'; '1035+' -> 'H1035'; 'c' -> 'H9002'."""
    lem = lemma.strip().rstrip("+").strip()
    if lem in PREFIX_KEYS:
        return PREFIX_KEYS[lem]
    num, _, letter = lem.partition(" ")
    if not num.isdigit() or (letter and not (len(letter) == 1 and letter.isalpha())):
        raise ParseError(f"unrecognised lemma {lemma!r}")
    return f"H{int(num)}{letter.lower()}"


def _suffix_key(code: str, host_pos: str, where: str) -> str:
    f = decode(code)
    t = code[1:2]
    if t in OTHER_SUFFIX_KEYS:
        return OTHER_SUFFIX_KEYS[t]
    kind = "P" if host_pos in "NA" else "O"
    pgn = f"{f.get('person', '')}{f.get('gender', '')}{f.get('number', '')}"
    try:
        return SUFFIX_KEYS[(kind, pgn)]
    except KeyError:
        raise ParseError(f"no TBESH suffix row for {code!r} ({kind}{pgn}) at {where}") from None


def parse_word(w: ET.Element, ref: str) -> dict:
    wid = w.get("id")
    raw_text = "".join(w.itertext()).strip()
    lemmas = (w.get("lemma") or "").split("/")
    lang, codes = split_language(w.get("morph") or "")
    texts = raw_text.split("/")
    where = f"{ref} {wid} {raw_text}"
    if lang != "H":
        raise ParseError(f"non-Hebrew word at {where}")
    if len(texts) != len(codes):
        raise ParseError(f"text/morph segment count mismatch at {where}")
    if len(lemmas) > len(codes) or any(not c.startswith("S") for c in codes[len(lemmas):]):
        raise ParseError(f"lemma/morph segment mismatch at {where}")
    n_lex = len(lemmas)
    main_idx = n_lex - 1
    host_pos = codes[main_idx][0]
    segs = []
    for i, (txt, code) in enumerate(zip(texts, codes)):
        try:
            label = decode(code)["label"]
        except MorphError as e:
            raise ParseError(f"{e} at {where}") from None
        if i < n_lex:
            key = lemma_key(lemmas[i])
            role = "main" if i == main_idx else "pre"
        else:
            key = _suffix_key(code, host_pos, where)
            role = "suf"
        segs.append({"t": pointed(txt), "x": key, "m": code, "g": label, "r": role})
    return {
        "id": wid,
        "ref": ref,
        "p": pointed(raw_text),
        "c": consonantal(raw_text),
        "segs": segs,
        "lex": segs[main_idx]["x"],
        "parse": " + ".join(s["g"] for s in segs),
    }


def parse_book(xml_path: Path, book: str) -> dict:
    root = ET.parse(xml_path).getroot()
    verses, kq = [], []
    for verse in root.iter(f"{NS}verse"):
        osis = verse.get("osisID")
        _, ch, vs = osis.split(".")
        ref = f"{int(ch)}.{int(vs)}"
        tokens: list[dict] = []
        para = False
        for el in verse:
            tag = el.tag.replace(NS, "")
            if tag == "w":
                tok = parse_word(el, ref)
                if el.get("type") == "x-ketiv":
                    tok["kq"] = "k"
                tokens.append(tok)
            elif tag == "seg":
                kind = el.get("type")
                if kind == "x-maqqef":
                    if not tokens:
                        raise ParseError(f"maqqef before any word in {ref}")
                    tokens[-1]["j"] = 1
                elif kind in ("x-pe", "x-samekh"):
                    para = True
                elif kind not in ("x-sof-pasuq", "x-paseq"):
                    raise ParseError(f"unknown seg {kind!r} in {ref}")
            elif tag == "note" and el.get("type") == "variant":
                rdg = el.find(f"{NS}rdg")
                if rdg is None or rdg.get("type") != "x-qere":
                    raise ParseError(f"variant note without qere reading in {ref}")
                has_catch = el.find(f"{NS}catchWord") is not None
                ketiv = tokens[-1] if has_catch and tokens else None
                if has_catch and (ketiv is None or ketiv.get("kq") != "k"):
                    raise ParseError(f"catchWord without preceding ketiv in {ref}")
                qwords = [parse_word(q, ref) for q in rdg.findall(f"{NS}w")]
                for q in qwords:
                    q["kq"] = "q"
                    tokens.append(q)
                kq.append({"ref": ref, "k": ketiv["id"] if ketiv else None, "q": [q["id"] for q in qwords]})
                if ketiv:
                    ketiv["pair"] = [q["id"] for q in qwords]
                for q in qwords:
                    q["pair"] = [ketiv["id"]] if ketiv else []
            elif tag == "note":
                continue  # WLC textual notes
            else:
                raise ParseError(f"unexpected element {tag!r} in {ref}")
        # A ketiv with no following variant note would be an unpaired ketiv: surface it.
        for t in tokens:
            if t.get("kq") == "k" and "pair" not in t:
                raise ParseError(f"ketiv {t['id']} in {ref} has no variant note")
        verses.append({"ref": ref, "c": int(ch), "v": int(vs), "tokens": tokens, **({"para": 1} if para else {})})
    return {"book": book, "verses": verses, "kq": kq}
