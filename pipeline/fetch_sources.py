"""Download the pinned source files listed in sources.json into data/sources/<key>/ and verify sha256.

Usage: python pipeline/fetch_sources.py
"""
from __future__ import annotations

import hashlib
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "data" / "sources"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    manifest = json.loads((ROOT / "pipeline" / "sources.json").read_text(encoding="utf-8"))
    failed = 0
    for key, src in manifest["sources"].items():
        for path, want in src["files"].items():
            out = DEST / key / Path(path).name
            if out.exists() and sha256(out.read_bytes()) == want:
                print(f"ok      {key}/{out.name}")
                continue
            url = f"https://raw.githubusercontent.com/{src['repo']}/{src['commit']}/{urllib.parse.quote(path)}"
            with urllib.request.urlopen(url, timeout=60) as r:
                data = r.read()
            got = sha256(data)
            if got != want:
                print(f"FAILED  {key}/{out.name}: sha256 {got} != pinned {want}", file=sys.stderr)
                failed += 1
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(data)
            print(f"fetched {key}/{out.name}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
