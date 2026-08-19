#!/usr/bin/env bash
# Manual install (pi does this automatically for git/npm installs).
set -euo pipefail
cd "$(dirname "$0")"
pnpm install || npm install     # runs scripts/fetch-skills.mjs via postinstall
pi install "$PWD"
echo "Done. Restart pi, then: /mcp"
