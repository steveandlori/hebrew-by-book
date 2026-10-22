"""Lexicon joins: TBESH glosses (STEPBible, CC BY) and the OpenScriptures Lexical Index + BDB (CC BY; BDB text PD).

Chain for a lexeme key like 'H6213a':
  TBESH row eStrong 'H6213a' (head row: dStrong field with nothing after '=')  -> gloss, Hebrew form, TBESH morph
  AugIndex aug '6213a' -> Lexical Index entry 'jxj' -> headword, transliteration, pos, short def, BDB entry id
  BDB entry id -> page number in BDB
Only TBESH's Gloss column is used. Its Meaning column is Online Bible material and needs separate permission.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

LI_NS = "{http://openscriptures.github.com/morphhb/namespace}"


def tbesh_key(key: str) -> str:
    """'H1' -> 'H0001'; 'H6213a' -> 'H6213a'."""
    m = re.fullmatch(r"H(\d+)([a-z]?)", key)
    if not m:
        raise ValueError(f"bad key {key!r}")
    return f"H{int(m.group(1)):04d}{m.group(2)}"


def load_tbesh(path: Path) -> dict[str, list[dict]]:
    """eStrong -> all its rows [{gloss, he, morph, dstrong, head}], in file order."""
    rows: dict[str, list[dict]] = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if not re.match(r"^H\d{4}[a-z]?\t", line):
            continue
        f = line.split("\t")
        if len(f) < 7:
            continue
        estrong, dstrong, _ustrong, he, _tr, morph, gloss = (x.strip() for x in f[:7])
        rows.setdefault(estrong, []).append(
            {"gloss": gloss, "he": he, "morph": morph, "dstrong": dstrong,
             "head": dstrong.endswith("=")})
    return rows


def pick_tbesh(rows: list[dict], is_name: bool) -> dict:
    """Choose the TBESH row for a lexeme. OSHB decides name vs word; TBESH name rows ('N:' morph) are
    used only for names and vice versa (e.g. H2428 has a 'Helech' place-name row beside 'strength').
    Within the kind, the head row (dStrong ending in a bare '=') wins, else the first row."""
    kind = [r for r in rows if r["morph"].startswith("N:") == is_name] or rows
    heads = [r for r in kind if r["head"]]
    return (heads or kind)[0]


def general_gloss(gloss: str) -> str:
    """TBESH writes 'general: specific' ('strength: worthy', 'to redeem: redeem'); keep the general part."""
    return gloss.split(":", 1)[0].strip() or gloss.strip()


def load_lexical_index(hl_dir: Path) -> tuple[dict[str, str], dict[str, dict]]:
    aug = {}
    for w in ET.parse(hl_dir / "AugIndex.xml").getroot().iter(f"{LI_NS}w"):
        aug[w.get("aug")] = w.text.strip()
    entries = {}
    for e in ET.parse(hl_dir / "LexicalIndex.xml").getroot().iter(f"{LI_NS}entry"):
        w, pos, d, x = (e.find(f"{LI_NS}{t}") for t in ("w", "pos", "def", "xref"))
        entries[e.get("id")] = {
            "he": (w.text or "").strip() if w is not None else "",
            "tr": (w.get("xlit") or "") if w is not None else "",
            "pos": (pos.text or "").strip() if pos is not None else "",
            "def": (d.text or "").strip() if d is not None else "",
            "bdb": x.get("bdb") if x is not None else None,
        }
    return aug, entries


def load_bdb_pages(hl_dir: Path) -> dict[str, int]:
    """BDB entry id -> page. Uses the entry's <status p=..>; falls back to the last <page p=..> seen."""
    pages: dict[str, int] = {}
    page = None
    root = ET.parse(hl_dir / "BrownDriverBriggs.xml").getroot()
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag == "page" and el.get("p"):
            page = int(el.get("p"))
        elif tag == "entry" and el.get("id"):
            st = next((s for s in el.iter() if s.tag.split("}")[-1] == "status" and s.get("p")), None)
            pages[el.get("id")] = int(st.get("p")) if st is not None else page
    return pages


def aug_of(key: str) -> str:
    """'H6213a' -> '6213a'."""
    return key[1:]
