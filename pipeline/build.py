"""Build data/<book>.js (an ES module the app imports) from the pinned sources.

Usage: python pipeline/build.py Ruth
Fails (exit 1) on any unmapped lexeme, unknown morph code or misaligned segment.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from hebrew import consonantal, pointed
from lexicon import aug_of, general_gloss, load_bdb_pages, load_lexical_index, load_tbesh, pick_tbesh, tbesh_key
from oshb import parse_book

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "sources"

BOOKS = {"Ruth": {"name": "Ruth", "he": "רוּת", "file": "Ruth.xml"}}
KQ_FIELDS = [("stem", "stem"), ("conj", "conjugation"), ("person", "person"),
             ("gender", "gender"), ("number", "number"), ("state", "state")]


def kq_differences(ketiv: dict | None, qere: list[dict]) -> list[str]:
    """Neutral list of what differs between the written and read forms."""
    if ketiv is None:
        return ["read, not written"]
    if not qere:
        return ["written, not read"]
    from morph import decode
    q = qere[0]
    out = []
    if ketiv["lex"] != q["lex"]:
        out.append("word")
    kseg, qseg = ketiv["segs"], q["segs"]
    for role in ("main", "suf"):
        ks = [s for s in kseg if s["r"] == role]
        qs = [s for s in qseg if s["r"] == role]
        if len(ks) != len(qs):
            out.append("suffix" if role == "suf" else "form")
            continue
        for a, b in zip(ks, qs):
            da, db = decode(a["m"]), decode(b["m"])
            if da["pos"] != db["pos"]:
                out.append("part of speech")
                continue
            for f, label in KQ_FIELDS:
                if da.get(f, "") != db.get(f, "") and label not in out:
                    out.append(label)
    return out or ["spelling"]


AFFIX_MIN = 9000  # TBESH numbers from 9000 up are prefixes, suffixes and punctuation, not words
OVERRIDE_FIELDS = {"gloss", "def", "kind", "mergeInto"}
# Pronominal suffixes on infinitives and participles can be subject/possessor or object; gloss both ways.
OBJ_TO_POSS = {f"H{9030 + i}": f"H{9020 + i}" for i in range(10)}


def is_affix(key: str) -> bool:
    return int("".join(ch for ch in key[1:] if ch.isdigit())) >= AFFIX_MIN


def load_overrides(book: str) -> dict:
    """pipeline/overrides/<book>.json: per-lexeme {gloss|def|kind|mergeInto, why, source}, plus
    _kq_notes {"<ref>:<key>": note} and _token_glosses {"<token id>": {gloss, why, source}}."""
    path = ROOT / "pipeline" / "overrides" / f"{book.lower()}.json"
    ov = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    for k, o in ov.items():
        if k.startswith("_"):
            continue
        if not (set(o) & OVERRIDE_FIELDS) or not o.get("why") or not o.get("source"):
            raise SystemExit(f"override {k} needs one of {sorted(OVERRIDE_FIELDS)} plus why and source")
    return ov


def build(book: str) -> dict:
    meta = BOOKS[book]
    sources = json.loads((ROOT / "pipeline" / "sources.json").read_text(encoding="utf-8"))["sources"]
    parsed = parse_book(SRC / "oshb" / meta["file"], book)
    tbesh = load_tbesh(next((SRC / "tbesh").iterdir()))
    aug, li = load_lexical_index(SRC / "hebrewlexicon")
    pages = load_bdb_pages(SRC / "hebrewlexicon")
    overrides = load_overrides(book)
    kq_notes = overrides.pop("_kq_notes", {})
    token_glosses = overrides.pop("_token_glosses", {})
    overrides = {k: o for k, o in overrides.items() if not k.startswith("_")}

    tokens = [t for v in parsed["verses"] for t in v["tokens"]]
    by_id = {t["id"]: t for t in tokens}
    errors, warnings = [], []

    # Merges: spellings BDB treats as one word (e.g. יָלַךְ under הָלַךְ) are re-keyed before anything else.
    merges = {k: o["mergeInto"] for k, o in overrides.items() if "mergeInto" in o}
    for t in tokens:
        for s in t["segs"]:
            if s["x"] in merges:
                s["x"] = merges[s["x"]]
        t["lex"] = next(s["x"] for s in t["segs"] if s["r"] == "main")

    lexemes: dict[str, dict] = {}
    # OSHB decides which lexemes are names: proper nouns (Np) and gentilics (Ng, Ag).
    name_keys = {s["x"] for t in tokens for s in t["segs"] if s["r"] == "main" and s["m"][:2] in ("Np", "Ng", "Ag")}
    for t in tokens:
        for s in t["segs"]:
            k = s["x"]
            if k in lexemes:
                continue
            rows = tbesh.get(tbesh_key(k))
            if not rows:
                errors.append(f"{k}: no TBESH row")
                continue
            tb = pick_tbesh(rows, k in name_keys)
            if not tb["head"]:
                warnings.append(f"{k}: TBESH has no head row of the right kind; used {tb['dstrong']!r} ({tb['gloss']})")
            rec = {"gloss": general_gloss(tb["gloss"]), "tg": tb["gloss"], "tm": tb["morph"]}
            if is_affix(k):
                rec.update({"affix": 1, "he": tb["he"].replace("/", "")})
            else:
                lid = aug.get(aug_of(k))
                e = li.get(lid) if lid else None
                if e is None:
                    errors.append(f"{k}: no Lexical Index entry")
                    continue
                if pages.get(e["bdb"]) is None:
                    errors.append(f"{k}: BDB entry {e['bdb']} has no page")
                    continue
                he = pointed(e["he"])
                rec.update({"he": he, "cons": consonantal(he), "tr": e["tr"], "pos": e["pos"],
                            "def": e["def"], "bdb": {"id": e["bdb"], "page": pages[e["bdb"]]}})
                if k in name_keys:
                    rec["name"] = 1
            o = overrides.get(k)
            if o:
                if "gloss" in o:
                    rec["gloss"] = o["gloss"]
                    rec["glossNote"] = {"was": tb["gloss"], "why": o["why"], "source": o["source"]}
                if "def" in o:
                    rec["def"] = o["def"] or ""
                if "kind" in o:
                    rec["kind"] = o["kind"]
            lexemes[k] = rec
    unused = sorted(k for k in overrides if k not in lexemes and k not in merges)
    if unused:
        errors.append(f"overrides for keys not in {book}: {unused}")

    # Suffix glosses that depend on the host: infinitives and participles get "his / him" style glosses.
    for t in tokens:
        main = next(s for s in t["segs"] if s["r"] == "main")
        if main["m"].startswith("V") and len(main["m"]) > 2 and main["m"][2] in "crs":
            for s in t["segs"]:
                if s["r"] == "suf" and s["x"] in OBJ_TO_POSS:
                    poss, obj = lexemes[OBJ_TO_POSS[s["x"]]]["gloss"], lexemes[s["x"]]["gloss"]
                    if poss != obj:
                        s["gl"] = f"{poss} / {obj}"

    # Occurrences, counts and first appearance. Every token is listed; the count is per place:
    # a written/read pair of the same word counts once, and so does a two-word name.
    for t in tokens:
        rec = lexemes.get(t["lex"])
        if rec is None:
            continue
        rec.setdefault("occ", []).append(t["id"])
        rec.setdefault("first", t["ref"])
        same_as_pair = t.get("kq") == "k" and any(by_id[q]["lex"] == t["lex"] for q in t.get("pair", []))
        if not same_as_pair and not t.get("cmp"):
            rec["n"] = rec.get("n", 0) + 1
    for rec in lexemes.values():
        rec.setdefault("n", 0)

    for tid, o in token_glosses.items():
        if tid not in by_id or not o.get("gloss") or not o.get("why") or not o.get("source"):
            errors.append(f"_token_glosses {tid}: unknown token or missing gloss/why/source")
        else:
            by_id[tid]["gl"] = {"gloss": o["gloss"], "why": o["why"], "source": o["source"]}

    kq = []
    used_notes = set()
    for e in parsed["kq"]:
        k = by_id.get(e["k"]) if e["k"] else None
        qs = [by_id[i] for i in e["q"]]
        place = {**e, "diff": kq_differences(k, qs)}
        key = f"{e['ref']}:{(k or qs[0])['lex']}"
        if key in kq_notes:
            place["note"] = kq_notes[key]
            used_notes.add(key)
        kq.append(place)
    if set(kq_notes) - used_notes:
        errors.append(f"_kq_notes for unknown places: {sorted(set(kq_notes) - used_notes)}")

    if errors:
        raise SystemExit("build failed:\n  " + "\n  ".join(errors))
    for w in warnings:
        print("warning:", w, file=sys.stderr)

    verses = []
    for v in parsed["verses"]:
        toks = []
        for t in v["tokens"]:
            out = {"id": t["id"], "p": t["p"], "c": t["c"], "lex": t["lex"], "parse": t["parse"],
                   "segs": [{k: s[k] for k in ("t", "x", "m", "g", "r", "gl") if k in s} for s in t["segs"]]}
            for opt in ("j", "kq", "pair", "cmp", "gl"):
                if opt in t:
                    out[opt] = t[opt]
            toks.append(out)
        verses.append({"ref": v["ref"], "c": v["c"], "v": v["v"], "t": toks, **({"para": 1} if v.get("para") else {})})

    return {
        "schema": 1,
        "book": {"id": book, "name": meta["name"], "he": meta["he"]},
        "sources": [{"key": key, "name": s["name"], "url": s["url"], "commit": s["commit"],
                     "licence": s["licence"], "credit": s["credit"]} for key, s in sources.items()],
        "verses": verses,
        "lexemes": lexemes,
        "kq": kq,
    }


def main(argv: list[str]) -> int:
    book = argv[1] if len(argv) > 1 else "Ruth"
    data = build(book)
    out = ROOT / "data" / f"{book.lower()}.js"
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    out.write_text(
        "// Generated by pipeline/build.py from pinned sources (see pipeline/sources.json). Do not edit by hand.\n"
        f"export default {body};\n", encoding="utf-8")
    n_tok = sum(len(v["t"]) for v in data["verses"])
    vocab = [k for k, r in data["lexemes"].items() if not r.get("affix") and not r.get("name")]
    names = [k for k, r in data["lexemes"].items() if r.get("name")]
    print(f"{out.relative_to(ROOT)}: {len(data['verses'])} verses, {n_tok} tokens, "
          f"{len(vocab)} vocabulary lexemes, {len(names)} names, {len(data['kq'])} ketiv/qere places, "
          f"{out.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
