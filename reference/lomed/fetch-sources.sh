#!/usr/bin/env bash
# Fetch the OSHB + Strong's source repositories at pinned commits.
#
# Both repos are large-ish but cleanly fetchable via shallow clone. The
# resulting data/sources/{morphhb,strongs}/ directories are gitignored.
#
# Usage:
#   scripts/fetch-sources.sh               # fetch into data/sources/
#   scripts/fetch-sources.sh /custom/dir   # fetch into a custom location

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

DEST="${1:-${REPO_ROOT}/data/sources}"

# Pinned commit SHAs — bump intentionally when a source revision is needed.
# When changed: re-run the build pipeline; metadata.sources in the artifact
# updates automatically; ATTRIBUTION.md should be updated with the new SHA.
OSHB_REPO="https://github.com/openscriptures/morphhb.git"
OSHB_COMMIT="3d15126fb1ef74867fc1434be1942e837932691f"

STRONGS_REPO="https://github.com/openscriptures/strongs.git"
STRONGS_COMMIT="0acd2f251c2d35ff8db2dece4e0593979d3ac223"

mkdir -p "$DEST"

clone_pinned() {
    local repo="$1"
    local commit="$2"
    local target="$3"
    if [[ -d "$target/.git" ]]; then
        echo "[$target] already cloned; fetching pinned commit..."
        git -C "$target" fetch --depth=1 origin "$commit"
        git -C "$target" checkout "$commit"
    else
        echo "[$target] cloning at pinned commit $commit..."
        git clone "$repo" "$target"
        git -C "$target" checkout "$commit"
    fi
    # Verify we landed on the pinned SHA (defends against typos/silent fetch issues).
    actual_sha=$(git -C "$target" rev-parse HEAD)
    if [[ "$actual_sha" != "$commit" ]]; then
        echo "ERROR: $target is at $actual_sha, expected $commit" >&2
        exit 2
    fi
}

clone_pinned "$OSHB_REPO" "$OSHB_COMMIT" "$DEST/morphhb"
clone_pinned "$STRONGS_REPO" "$STRONGS_COMMIT" "$DEST/strongs"

echo
echo "Sources fetched. Now run: scripts/build.sh"
