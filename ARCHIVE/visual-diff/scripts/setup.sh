#!/usr/bin/env bash
# Installs playwright-core + the Chromium build into the skill directory.
# Idempotent: exits immediately when the browser is already present.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -d node_modules/playwright-core ] && npx --no-install playwright-core --version >/dev/null 2>&1; then
  :
else
  npm install --silent --no-fund --no-audit playwright-core >/dev/null
fi

# `playwright install` is a no-op when the matching build is already cached.
npx --yes playwright install chromium 2>&1 | tail -2

echo "visual-diff ready"
