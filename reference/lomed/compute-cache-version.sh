#!/usr/bin/env bash
# Compute the service-worker CACHE_VERSION from app/ + data/ content.
#
# Output is an 8-char hex prefix of SHA-256 over all relevant files. The
# deploy workflow substitutes this into sw.js by replacing the
# `__CACHE_VERSION__` token. This avoids the "every commit invalidates
# every cache" trap (spec §5.4, A-M3).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# Hash everything in app/ and data/ except sw.js itself (which we'll rewrite
# with the result) and any non-tracked artifacts under data/sources/.
# Hash everything in app/ except sw.js (which we'll rewrite with the result).
# Build artifacts now live under app/data/ so a single tree is enough.
# `metadata.generated_at` is excluded because timestamps would otherwise
# defeat the "don't bump cache on every commit" guarantee (spec A-M3).
find app -type f ! -name 'sw.js' -print0 \
  | sort -z \
  | xargs -0 -I{} sh -c '
      case "{}" in
        */data/*.json)
          # Strip metadata.generated_at before hashing JSON build artifacts
          # so a no-content rebuild produces an identical cache version.
          python -c "import json,sys; d=json.load(open(\"{}\",encoding=\"utf-8\")); m=d.get(\"metadata\"); m and m.pop(\"generated_at\", None); print(json.dumps(d, sort_keys=True, ensure_ascii=False))" | sha256sum
          ;;
        *)
          sha256sum "{}"
          ;;
      esac
    ' \
  | sha256sum | awk '{print substr($1, 1, 8)}'
