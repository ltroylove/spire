#!/bin/bash
# Spire Startup Script
# MUST run from internal/http/spa/ so the relative LocalBasePath
# ("../../../frontend/dist/") resolves to the actual frontend/dist/ directory.
# Without this, the Go binary serves stale packr-embedded frontend files.
#
# Usage:
#   ./start-spire.sh 3010        # Start production (foreground)
#   ./start-spire.sh 3010 -d     # Start production (daemon)
#   ./start-spire.sh 8081 -d     # Start dev (daemon)

SPIRE_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNTIME_DIR="$SPIRE_DIR/internal/http/spa"
PORT="${1:-3010}"
DAEMON="${2:-}"

cd "$RUNTIME_DIR" || { echo "ERROR: Cannot cd to $RUNTIME_DIR"; exit 1; }

if [ "$DAEMON" = "-d" ]; then
    setsid "$SPIRE_DIR/spire" http:serve --port "$PORT" </dev/null &>/tmp/spire-$PORT.log &
    PID=$!
    echo "[start-spire] Daemon started on port $PORT (PID: $PID, CWD: $RUNTIME_DIR)"
    echo "$PID" > /tmp/spire-$PORT.pid
else
    echo "[start-spire] Starting Spire on port $PORT (CWD: $RUNTIME_DIR)"
    exec "$SPIRE_DIR/spire" http:serve --port "$PORT"
fi
