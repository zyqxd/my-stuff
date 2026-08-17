---
name: refine-memory
description: Use only when the human explicitly invokes `/skill:refine-memory` to turn lessons into actionable memory, resolve conflicts, and prune bloat without touching other skills.
disable-model-invocation: true
---

# Refine Memory

> **HARD GATE** — Never edit, delete, move, or promote memory before showing the exact proposal and receiving explicit human approval. Never inspect or alter other skills. Never store secrets, personal data, buyer or merchant data, speculation, or transient status.
>
> **RATIONALE GATE** — Never invent, erase, or silently generalize the failure, cause, scope, evidence, or uncertainty that makes a lesson useful. Incomplete lessons require clarification, not compression.

## Default scope

Audit `~/Workspace/my-stuff/ai/AGENTS.md` and `~/Workspace/my-stuff/ai/lessons/*.md`. Treat the first as a **constitution** — a short, always-loaded list of commandments, amended rarely — and the second as scoped evidence and patterns. Lessons accumulate weekly; the constitution does not.

### Drain pass

Each run also drains upstream exhaust as **candidate evidence, never authority**:

- `~/Workspace/my-stuff/ai/memory/MEMORY.md` and `ai/memory/daily/*.md` — pi-memory output.
- The brain personal bank diff since the watermark in `ai/memory/drain-state.json`:
  `git -C $(brain memory-bank resolve personal) diff <sha>..HEAD -- projects plans`.
  Exclude `core/dailyContext.md` and history — it is a status view whose durable content already lands in project `decisions.md`.

Route each drained item: behavior → scoped lesson; durable fact → `ai/memory/MEMORY.md` (propose `memory_write`); noise → propose `memory_forget` or skip. Never edit brain files; originals stay in place. Update the watermark and `drained_at` only after approved operations are applied, so a rejected or aborted run re-presents the same material.

Other than this skill's already-loaded instructions and reference, exclude every `skills/` path. Never read, compare, audit, edit, or propose changes to skills or their evals. A procedural lesson remains scoped or is deferred for separate user-directed work.

Inspect a Brain bank, Claude/Codex generated memory, or another path only when the invocation names it. Resolve a named Brain bank with `brain memory-bank resolve <name>`. Generated memory is evidence, never authority. Exclude daily context, project status, transcripts, and history unless explicitly requested.

Read [REFERENCE.md](REFERENCE.md) before classifying candidates. If its research cutoff is more than six months old, refresh the cited first-party Anthropic and OpenAI guidance before changing this skill's policy.

## Workflow

### 1. Establish a safe baseline

- Confirm scope, authority, and destination; ask only when the invocation is ambiguous.
- Read governing `CLAUDE.md` files and repository instructions before target files.
- Record `git status --short`, target diffs, and `wc -l -w -c` for always-loaded and total audited memory.
- Do not absorb, revert, or reformat unrelated changes.

### 2. Check whether each lesson is sufficient

Before shortening or classifying a lesson, extract:

- **Trigger or failure:** what happened, or when the preference applies.
- **Cause or rationale:** why the outcome was wrong; an explicit human preference is sufficient rationale.
- **Action:** what future behavior should change.
- **Scope and boundary:** where it applies and important exceptions.
- **Evidence and status:** source, recurrence, and what remains unknown or unverified.

If compression would lose one of these, preserve the detail. If the lesson lacks enough information, use `clarify`, list the missing questions, and leave it unchanged. Remove identifying or volatile details only when the causal evidence remains clear.

### 3. Classify candidates

Candidates come from scoped lessons **and from the constitution itself**: re-audit every existing commandment against the format and promotion gate; one that has accreted caveats, extra bullets, or narrow clauses is a rewrite or `demote` candidate.

Group lessons only when they share a trigger, cause, and corrective action. Give every candidate exactly one disposition:

- `promote` — amend the constitution; requires a pattern refined through multiple independent lessons and passing every promotion gate.
- `consolidate` — merge repeated scoped evidence without widening or weakening it.
- `clarify` — rationale, scope, evidence, or uncertainty is insufficient; ask targeted questions.
- `demote` — move a commandment that no longer passes every gate back into its scoped lesson file.
- `keep` — useful scoped lesson that is already clear.
- `defer` — procedure or on-demand fact stays outside commandments and other stores remain untouched.
- `remove` — stale, contradicted, redundant, derivable, or transient content with no remaining causal value.

Prefer revising an existing rule over adding a near-duplicate. A one-off correction stays scoped unless the human explicitly declares it constitutional. The default disposition for a new lesson is `keep` or `consolidate` in its scoped file; amendment is the exception, not the weekly output.

Lessons have a lifecycle too: when a scoped file exceeds roughly 150 lines, propose a consolidation pass for it in the same audit.

### 4. Synthesize direct rules and compare meaning

- Write scoped lessons in plain, imperative language: **when this happens → do this → verify this → observe this boundary**.
- Write every commandment in the constitution format defined in REFERENCE.md: a bold imperative title plus at most three one-line bullets.
- When evidence adds an exception to an existing commandment, rewrite it at the level of principle that covers both cases; never append caveats, sub-clauses, or "unless" chains.
- Amendments default to net-zero growth: pair each addition with a merge, `demote`, or `remove`, and report the footprint delta.
- On promotion, collapse each source lesson to a one-line provenance pointer to the commandment; never hold the same rule in two layers.
- Map every claimed prevented failure to the clause that prevents it; principle-level coverage counts, but a clause may never be narrower than the failure it claims to prevent.
- Compare rules semantically by trigger, prescribed action, scope, and exceptions. Different headings or vocabulary do not make conflicting actions compatible.
- Preserve uncertainty and next evidence needed; never convert “unknown” into a conclusion merely to make a rule timeless.

For each promotion, state recurrence evidence, scope, shelf life, non-obvious value, conflicts or replacements, and loaded cost. Reject permanent context whose expected benefit does not justify that cost.

### 5. Write the review artifact and stop

Write `~/plans/memory-refinement/YYYY-MM-DD-memory-refinement.md` using the real system date, per the Report Output Convention. Start with a short **Human review** section containing the verdict, proposed decisions, risks or unresolved questions, and footprint delta. Put scope, evidence maps, semantic conflict checks, and exact patches afterward.

Preview the complete proposal and ask the human to approve all, approve selected items, revise, or stop. **Do not edit memory in this turn.**

### 6. Apply only approved operations

After approval, re-read every target and diff. Stop and re-propose on drift. Apply only approved text and preserve rationale in the scoped lesson or audit. Do not commit, push, or submit shared Brain changes unless explicitly requested.

### 7. Verify

- Re-run `wc -l -w -c` and report measured deltas.
- Re-run the lesson-sufficiency, failure-coverage, and semantic-conflict checks against the resulting text.
- Inspect the target-only diff; any changed `skills/` path during a memory run is a hard failure.
- Confirm every promotion passes every gate, uncertainty remains explicit, and removals are recoverable from version control or retained provenance.
- Update the audit with applied operations, verification evidence, and deferred or clarification candidates.
