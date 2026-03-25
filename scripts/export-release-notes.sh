#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CHANGELOG_FILE="$ROOT_DIR/CHANGELOG.md"

FIELD=""
OUTPUT_FILE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --field)
      FIELD="$2"
      shift 2
      ;;
    *)
      OUTPUT_FILE="$1"
      shift
      ;;
  esac
done

"$ROOT_DIR/scripts/validate-changelog.sh" >/dev/null

TOP_HEADER=$(grep -m1 '^## \[' "$CHANGELOG_FILE" || true)
if [ -z "$TOP_HEADER" ]; then
  echo "CHANGELOG.md is missing a top release heading" >&2
  exit 1
fi

TOP_VERSION=$(printf '%s\n' "$TOP_HEADER" | sed -E 's/^## \[([^]]+)\].*/\1/')
TOP_RELEASE_DATE=$(printf '%s\n' "$TOP_HEADER" | sed -E 's/^## \[[^]]+\] (.*)$/\1/')

TOP_SECTION=$(
  awk '
    BEGIN { capture = 0 }
    /^## \[/ {
      if (capture == 1) {
        exit
      }
      capture = 1
    }
    capture == 1 { print }
  ' "$CHANGELOG_FILE"
)

if [ -z "$(printf '%s' "$TOP_SECTION" | tr -d '\r\n\t ')" ]; then
  echo "Top changelog release section is empty" >&2
  exit 1
fi

case "$FIELD" in
  "")
    if [ -n "$OUTPUT_FILE" ]; then
      printf '%s\n' "$TOP_SECTION" > "$OUTPUT_FILE"
    else
      printf '%s\n' "$TOP_SECTION"
    fi
    ;;
  version)
    printf '%s\n' "$TOP_VERSION"
    ;;
  tag)
    printf 'v%s\n' "$TOP_VERSION"
    ;;
  title)
    printf 'Spire v%s\n' "$TOP_VERSION"
    ;;
  release_date)
    printf '%s\n' "$TOP_RELEASE_DATE"
    ;;
  *)
    echo "Unknown field [$FIELD]" >&2
    exit 1
    ;;
esac
