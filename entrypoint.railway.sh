#!/bin/sh
set -eu

# Validate PORT is numeric only (defense-in-depth)
case "${PORT:-}" in
  ""|*[!0-9]*)
    echo "Invalid PORT: ${PORT:-}" >&2
    exit 1
    ;;
esac

exec /app/spire http:serve --port "$PORT"
