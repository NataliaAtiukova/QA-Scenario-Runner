#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="4173"
URL="http://127.0.0.1:${PORT}"
LOG_DIR="$PROJECT_DIR/.logs"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm не найден. Установите Node.js LTS: https://nodejs.org"
  exit 1
fi

if nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
  echo "QA Scenario Runner уже запущен на $URL"
  open "$URL"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Установка зависимостей..."
  npm install
fi

echo "Сборка приложения..."
npm run build

echo "Запуск приложения на $URL"
npm run preview -- --host 127.0.0.1 --port "$PORT" >> "$LOG_DIR/preview.log" 2>&1 &
PREVIEW_PID=$!

for _ in {1..40}; do
  if nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
    open "$URL"
    break
  fi
  sleep 0.25
done

echo "PID: $PREVIEW_PID"
echo "Логи: $LOG_DIR/preview.log"
echo "Для остановки нажмите Ctrl+C в этом окне."
wait "$PREVIEW_PID"
