#!/usr/bin/env bash
# Rebuild every dataset and the page from raw captures, then test and export outputs.
set -euo pipefail
cd "$(dirname "$0")"
for step in pipeline/0[0-9]_*.py; do
  echo "▶ $step"
  python3 "$step" > /dev/null
done
echo "✓ datasets in site/data/, page in site/index.html"
if command -v node > /dev/null; then
  [ -d node_modules ] || npm install --silent
  node tests/check_calcs.mjs     # runs every calculation; writes outputs/ and docs/calculations.md
  node tests/check_marks.mjs     # every number on the page resolves to data
  node tests/smoke.mjs           # clicks through the page in a simulated browser
else
  echo "Node.js not found: skipped tests and output export (install Node 18+ and re-run)."
fi
echo "View it: python3 -m http.server -d site 8000  →  http://localhost:8000"
