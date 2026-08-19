#!/usr/bin/env bash
# Reproduce this install from a fresh checkout (node_modules/ and vendor/ are gitignored).
set -euo pipefail

cd "$(dirname "$0")"

FIGMA_SHA=72fcf1f4b170bcaa78fa8bef2f27cce15f4d58f4

pnpm install

if [ ! -d vendor/figma-mcp-server-guide/.git ]; then
  git clone https://github.com/figma/mcp-server-guide.git vendor/figma-mcp-server-guide
fi
git -C vendor/figma-mcp-server-guide fetch --quiet origin
git -C vendor/figma-mcp-server-guide checkout --quiet "$FIGMA_SHA"

if ! pi list 2>/dev/null | grep -q "ai/figma-mcp"; then
  pi install "$PWD"
fi

echo "Done. Restart pi, then run: /mcp-auth figma"
