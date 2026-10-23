"""Every external URL the app shows must be live. Run: python test/linkcheck.py

Checks the source/credit URLs and the Sefaria link for every verse in each built book (Sefaria returns 404 for
references that do not exist, so this also proves the reference format). STEP Bible answers scripted clients with
403, so its verse links are not checked here; one was verified by hand in a browser (Ruth 3:3, 2026-10-22).
Haktuvim answers 200 for any chapter (the text loads by script, so Ruth.9 is "live" too); its chapter links are not
checked here. Ruth 1 (Steve) and Ruth 3 (Playwright: text and audio player) were checked in a browser, 2026-10-23.
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0 (hebrew-by-book link check)"}


def status(url: str) -> int:
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:  # noqa: BLE001 (network failure counts as a dead link)
        return 0


def main() -> int:
    urls = set()
    for src in json.loads((ROOT / "pipeline" / "sources.json").read_text(encoding="utf-8"))["sources"].values():
        urls.add(src["url"])
    app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
    urls.update(u for u in re.findall(r'href="(https://[^"$]+)"', app))
    for book_js in (ROOT / "data").glob("*.js"):
        text = book_js.read_text(encoding="utf-8")
        data = json.loads(text[text.index("{"): text.rindex("}") + 1])
        bid = data["book"]["id"]
        for v in data["verses"]:
            urls.add(f"https://www.sefaria.org/{bid}.{v['c']}.{v['v']}?lang=he")
    bad = []
    for u in sorted(urls):
        code = status(u)
        if code != 200:
            bad.append((code, u))
        time.sleep(0.2)
    for code, u in bad:
        print(f"DEAD {code} {u}")
    print(f"{len(urls) - len(bad)}/{len(urls)} links live")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
