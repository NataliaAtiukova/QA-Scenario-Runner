#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/.logs"
URL="http://127.0.0.1:5173"

mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

npm run dev -- --host 127.0.0.1 --port 5173 >> "$LOG_DIR/dev.log" 2>&1 &
DEV_PID=$!

for _ in {1..40}; do
  if nc -z 127.0.0.1 5173 >/dev/null 2>&1; then
    open "$URL"
    break
  fi
  sleep 0.5
done

wait "$DEV_PID"
