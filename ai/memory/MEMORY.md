<!-- 2026-08-16 20:45:35 [01a00d19] -->
## pi-memory + qmd setup (2026-08-16)

- **Pi package source of truth is `~/.pi/agent/settings.json`** (`packages` array), NOT `~/.pi/agent/npm/package.json`. The latter is generated; any `pi` command reconciles it from settings and silently reverts manual edits. Use `pi install` / `pi remove` / `pi list` (not `pi package ...`, which is not a command). #lesson
- Removed junk placeholder packages `npm:pi-ai` and `npm:pi-coding-agent` (empty name-reservation stubs by Armin Ronacher). They never satisfied pi-memory's peers.
- **The pi-memory peer-dep warning for `@earendil-works/pi-ai` / `pi-coding-agent` is cosmetic** — pi bundles them in its own runtime (`~/.pi/pkg/pi-<ver>/node_modules/@earendil-works/`) and injects them at load. Never "fix" it by installing lookalike packages. #lesson
- `memory_search` requires qmd for **all** modes including `keyword` — it gates on qmd availability before branching on mode. Other memory tools work without qmd.
- **qmd install on this machine (Shopify toolchain blocks global `npm` and `npx`):** installed via `PNPM_HOME=~/.local/share/pnpm pnpm add -g @tobilu/qmd` (v2.5.3).
  - pnpm 10 blocks native build scripts; added `pnpm.onlyBuiltDependencies` (better-sqlite3, node-llama-cpp, tree-sitter-*) to `~/.local/share/pnpm/global/5/package.json` and re-ran `CI=true pnpm install`.
  - `better-sqlite3`'s `prebuild-install` **exits 0 while producing no binary** on Node 24 (ABI 137), so the `|| node-gyp rebuild` fallback never fires. Had to run `pnpm dlx node-gyp rebuild --release` manually in its `.pnpm` dir. #lesson
  - PATH: `~/.local/share/pnpm` is not on PATH and pnpm's shim resolves its payload from `dirname($0)`, so it **cannot be symlinked**. Wrapper script at `~/.local/bin/qmd` (already on PATH) execs the real shim.
  - Shell rc files (`~/.zshrc`, `~/.bashrc`) are owned by the Shopify `tec` agent — do not inject into them. #preference
- Verified: qmd 2.5.3, collection `pi-memory` created, embeddings ready, all three search modes (keyword/semantic/deep) return results in a fresh pi process.

<!-- 2026-08-17 refine-memory (approved audit 2026-08-17) -->
## Agent tooling facts (2026-08-17)

- Agent-file symlinks: `~/.pi/agent/CLAUDE.md`, `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` → `my-stuff/ai/AGENTS.md`; `~/.pi/agent/memory` → `ai/memory`; skills linked per-directory from `ai/skills/`.
- **pnpm global fragility:** a future `pnpm add -g <pkg>` can rewrite pnpm's global `package.json` and drop `pnpm.onlyBuiltDependencies`; `setup.sh agents` won't repair it (the qmd short-circuit passes). Symptom: `better_sqlite3.node` "tries" stack trace after a qmd upgrade; fix: `pnpm dlx node-gyp rebuild --release` in its `.pnpm` dir.
