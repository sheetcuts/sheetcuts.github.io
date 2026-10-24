#!/bin/sh
# Refresh the onboarding page's copies of the extension's practice-sheet files
# (shortcut tree, Quick Access logic, overlay, practice sheet). Run after any
# change to those files in ../SheetCuts:   sh Site/practice/_sync-practice.sh
# The leading underscore keeps Jekyll / GitHub Pages from publishing this script.
set -e
here="$(cd "$(dirname "$0")" && pwd)"
ext="$here/../../SheetCuts"
cp "$ext/shortcuts.js" "$ext/custom-shortcuts.js" "$ext/overlay.js" \
   "$ext/practice-sheet.js" "$ext/practice-sheet.css" "$here/"
cp "$ext/styles.css" "$here/overlay.css"
echo "Synced practice files from $ext"
