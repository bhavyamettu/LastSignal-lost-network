#!/bin/bash
# SPARDHA 2K26 Round 3 - kiosk mode (Esc cannot leave full screen). Quit with Cmd+Q after the round.
URL="${1:-file://$(cd "$(dirname "$0")" && pwd)/index.html}"
open -na "Google Chrome" --args --kiosk --user-data-dir=/tmp/spardha-kiosk --no-first-run "$URL"
