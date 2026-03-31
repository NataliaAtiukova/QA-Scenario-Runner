#!/bin/zsh
set -euo pipefail

LABEL="com.qa.scenario.runner"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
rm -f "$PLIST_PATH"

printf "Autostart disabled.\n"
printf "Removed: %s\n" "$PLIST_PATH"
