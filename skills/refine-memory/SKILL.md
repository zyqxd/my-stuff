---
name: refine-memory
description: Use only when the human explicitly invokes `/skill:refine-memory` to consolidate lessons, prune memory bloat, and propose commandment-quality promotions.
disable-model-invocation: true
---

# Refine Memory

> **HARD GATE** — Never edit, delete, move, or promote memory before showing the exact proposal and receiving explicit human approval. Never inspect or alter other skills. Never store secrets, personal data, buyer or merchant data, speculation, or transient status.

## Default scope

Audit only `~/Workspace/my-stuff/ai/CLAUDE.md` and `~/Workspace/my-stuff/ai/lessons/*.md`. Treat the first as always-loaded commandments and the second as scoped evidence and patterns.

Other than this skill's already-loaded instructions and reference, exclude every `skills/` path. Never read, compare, audit, edit, or propose changes to skills or their evals. A procedural lesson remains scoped or is deferred for separate user-directed work.

Inspect a Brain bank, Claude/Codex generated memory, or another path only when the invocation names it. Resolve a named Brain bank with `brain memory-bank resolve <name>`. Generated memory is evidence, never authority. Exclude daily context, project status, transcripts, and history unless explicitly requested.

Read [REFERENCE.md](REFERENCE.md) before classifying candidates. If its research cutoff is more than six months old, refresh the cited first-party Anthropic and OpenAI guidance before changing this skill's policy.

## Workflow

### 1. Establish a safe baseline

- Confirm scope, authority, and destination; ask only when the invocation is ambiguous.
- Read governing `CLAUDE.md` files and repository instructions before target files.
- Record `git status --short`, existing target diffs, and `wc -l -w -c` for always-loaded files.
- Do not absorb, revert, or reformat unrelated changes.

### 2. Distill candidates

Group overlapping lessons into one repeatable pattern while preserving the strongest source evidence. For every candidate, choose exactly one disposition:

- `promote` — concise commandment that passes every promotion gate.
- `consolidate` — merge repeated scoped lessons without widening scope.
- `keep` — useful lesson lacking enough evidence or breadth.
- `defer` — keep a procedure or on-demand fact out of commandments without inspecting or changing another store.
- `remove` — stale, contradicted, redundant, derivable, or transient content.

Prefer updating an existing rule over adding a near-duplicate. Never turn a one-off correction into a universal commandment unless the human explicitly declares it durable.

### 3. Evaluate effectiveness against cost

For each proposed commandment, state:

- failures it prevents and evidence of recurrence;
- intended scope and expected shelf life;
- why a capable agent could not reliably infer it;
- existing rules it replaces or conflicts with;
- loaded words/bytes added or removed.

Reject candidates whose expected benefit does not justify permanent context cost. Keep procedures and scoped guidance in lessons or defer them for separate user-directed work. Never treat skill files as refinement inputs or destinations.

### 4. Write the review artifact and stop

Write `~/plans/DD_MM_YYYY-memory-refinement.md` using the real system date. Include baseline footprint, classifications, exact before/after text, destination paths, removals, provenance, conflicts, and projected net footprint.

Preview the complete proposal and ask the human to approve all, approve selected items, revise, or stop. **Do not edit memory in this turn.**

### 5. Apply only approved operations

After approval, re-read every target and its diff. Stop and re-propose if content drifted. Apply only approved text; keep each commandment one verifiable sentence, ideally no more than 30 words. Preserve evidence in the scoped lesson or audit instead of bloating the commandment.

Do not commit, push, or submit shared Brain changes unless explicitly requested.

### 6. Verify

- Re-run `wc -l -w -c` and report the measured delta.
- Search for surviving duplicates, contradictions, stale references, and sensitive data.
- Inspect the target-only diff and prove unrelated changes are untouched; any changed `skills/` path is a hard failure.
- Confirm every promotion passes every gate and every removal remains recoverable from version control or retained provenance.
- Update the audit with applied operations, verification evidence, and deferred candidates.
