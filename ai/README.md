# Agent memory

Durable memory lives here, in version control — **never** inside a
project/monorepo checkout. `ai/AGENTS.md` is the canonical constitution behind
every per-tool symlink.

Demoted from `ai/AGENTS.md` on 2026-09-01 — the constitution keeps the
behavioural rules; this directory map is read on demand.

## Layout

- **`AGENTS.md`** — the constitution. Symlinked to `~/.pi/agent/CLAUDE.md`,
  `~/.claude/CLAUDE.md`, and `~/.codex/AGENTS.md`. Always loaded, so it stays
  short: commandments only, no reference material.
- **`lessons/<scope>.md`** — evidence-backed patterns, one file per project or
  World zone (e.g. `admin-web.md`, `world-git.md`). Read for relevant work.
  - `lessons/archive/` — retired lesson files. Kept, never deleted.
- **`memory/MEMORY.md`** — durable retrievable facts (pi-memory store;
  `~/.pi/agent/memory` symlinks here). Searched on demand.
- **`memory/daily/`, `memory/SCRATCHPAD.md`** — unversioned exhaust, drained by
  the weekly refine-memory run and then left to expire.
- **`memory/drain-state.json`** — watermark for the brain personal-bank drain.
- **`agents/`** — pi subagent definitions plus the routing table (`README.md`).

## Where things go

- **Reports and unit state:** `~/plans/` — a symlink into the brain personal
  bank (`~/.brain/memory-bank/personal/plans/`). See `~/plans/README.md`.
- **SCRATCHPAD:** from the summarizer's first live day, no new unit-scoped
  warnings/todos in SCRATCHPAD — those go to the unit STATE head's
  `next`/`blocked` slots. SCRATCHPAD keeps non-unit-scoped notes; existing
  entries stay until T+2w.
- **Never** a `tasks/` (or similar) folder inside a repo checkout. In the World
  monorepo such a folder is untracked-but-not-ignored (`?? tasks/`), so it risks
  being committed to shop/world; it is per-worktree, so memory never
  accumulates; and it is destroyed when the worktree is cleaned up.

## Layering rule

Keep information at the narrowest layer that reliably serves it. A rule that
changes behaviour every session is a commandment; a rule that applies to one
zone is a lesson; a fact you look up is memory. Never hold one rule in two
layers — promote it, then leave a one-line provenance pointer behind.
