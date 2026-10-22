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


def build(book: str) -> dict:
    meta = BOOKS[book]
    sources = json.loads((ROOT / "pipeline" / "sources.json").read_text(encoding="utf-8"))["sources"]
    parsed = parse_book(SRC / "oshb" / meta["file"], book)
    tbesh = load_tbesh(next((SRC / "tbesh").iterdir()))
    aug, li = load_lexical_index(SRC / "hebrewlexicon")
    pages = load_bdb_pages(SRC / "hebrewlexicon")
    ov_path = ROOT / "pipeline" / "overrides" / f"{book.lower()}.json"
    overrides = json.loads(ov_path.read_text(encoding="utf-8")) if ov_path.exists() else {}

    tokens = [t for v in parsed["verses"] for t in v["tokens"]]
    by_id = {t["id"]: t for t in tokens}
    errors = []
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
            rec = {"gloss": general_gloss(tb["gloss"]), "tg": tb["gloss"], "tm": tb["morph"]}
            if k.startswith("H9"):
                rec.update({"affix": 1, "he": tb["he"].replace("/", "")})
            else:
                lid = aug.get(aug_of(k))
                e = li.get(lid) if lid else None
                if e is None:
                    errors.append(f"{k}: no Lexical Index entry")
                    continue
                if e["bdb"] not in pages:
                    errors.append(f"{k}: BDB entry {e['bdb']} has no page")
                    continue
                he = pointed(e["he"])
                rec.update({"he": he, "cons": consonantal(he), "tr": e["tr"], "pos": e["pos"],
                            "def": e["def"], "bdb": {"id": e["bdb"], "page": pages[e["bdb"]]}})
                if k in name_keys:
                    rec["name"] = 1
            if k in overrides:
                o = overrides.pop(k)
                rec["gloss"] = o["gloss"]
                rec["glossNote"] = {"was": tb["gloss"], "why": o["why"], "source": o["source"]}
            lexemes[k] = rec
    if overrides:
        errors.append(f"overrides for keys not in {book}: {sorted(overrides)}")

    # Occurrences (main segments only), counts and first appearance.
    for t in tokens:
        rec = lexemes.get(t["lex"])
        if rec is None:
            continue
        rec.setdefault("occ", []).append(t["id"])
        rec.setdefault("first", t["ref"])
    for k, rec in lexemes.items():
        rec["n"] = len(rec.get("occ", []))

    kq = []
    for e in parsed["kq"]:
        k = by_id.get(e["k"]) if e["k"] else None
        qs = [by_id[i] for i in e["q"]]
        kq.append({**e, "diff": kq_differences(k, qs)})

    if errors:
        raise SystemExit("build failed:\n  " + "\n  ".join(errors))

    verses = []
    for v in parsed["verses"]:
        toks = []
        for t in v["tokens"]:
            out = {"id": t["id"], "p": t["p"], "c": t["c"], "lex": t["lex"], "parse": t["parse"],
                   "segs": [{k: s[k] for k in ("t", "x", "m", "g", "r")} for s in t["segs"]]}
            for opt in ("j", "kq", "pair"):
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
