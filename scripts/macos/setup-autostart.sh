#!/bin/zsh
set -euo pipefail

LABEL="com.qa.scenario.runner"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
START_SCRIPT="$PROJECT_DIR/scripts/macos/start-on-login.sh"
LOG_DIR="$PROJECT_DIR/.logs"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$LOG_DIR"
chmod +x "$START_SCRIPT"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/zsh</string>
      <string>-lc</string>
      <string>\"$START_SCRIPT\"</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchd.out.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchd.err.log</string>
  </dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

printf "Autostart enabled.\n"
printf "Agent: %s\n" "$LABEL"
printf "Plist: %s\n" "$PLIST_PATH"
