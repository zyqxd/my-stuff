# Subagent routing (pi-subagents)

Demoted from `ai/AGENTS.md` on 2026-09-01 — reference material, read on demand.
The constitution keeps only the two imperatives; the table lives here.

When a task calls for delegation — or a bigpowers skill references the "Agent
tool" — use the `subagent` tool. Route by role:

- Ambiguous ask, scoping, planning from vague requirements → `shaper` (writes plan.md)
- Codebase recon before planning or implementation → `scout` (writes context.md)
- External facts, docs, or library research → `researcher`
- Implementation of a scoped brief → `worker`; Figma design-to-code → `design-worker`
- Review of diffs, plans, or proposals (request-review, audit-code) → `reviewer`; parallel reviewers for large diffs
- Second opinion or drift check before a risky decision → `oracle` (forks context)
- Generic isolated errand → `delegate`

Defaults: dispatch `shaper` at the start of orchestrating ambiguous work;
`scout` before non-trivial implementation in unfamiliar code; a fresh `reviewer`
before declaring multi-file work done. bigpowers task_brief format (goal,
in_scope, out_of_bounds, verify) remains the brief protocol.

Dispatch briefs give each child an explicit absolute output path into the unit's
`inbox/` (`~/plans/<project>/<unit>/inbox/`) — e.g.
`/Users/david.yq.zhang/plans/improve-cancellation-reactivation/7529/inbox/scout-context.md`
— never a relative path or one the child invents.

## Operational notes

- `runs.all` children of the same agent type collide on that agent's default
  output path and all fail instantly. Pass an explicit distinct `output` per
  item. (2026-08-28, and again during the 2026-09-01 memory refinement.)
- `researcher` **declares** `web_search, fetch_content, get_search_content`, but on
  2026-08-28 a run resolved with read/write/contact_supervisor only and fell back to
  "from memory" answers. Unresolved: whether the definition changed since or the tools
  fail to resolve at runtime. Check the run's tool list before trusting a web brief;
  `curl` from the parent is the reliable path.
- A reviewer's output lives only in its session transcript, not `status.json`:
  `output-archives/<runId>.json` → `session.jsonl` → longest assistant text block.
- An async workflow with a failed child cannot be stopped — `interrupt` is
  unsupported and `stop` refuses. Wait on a new run id.

Agent definitions themselves are the sibling `*.md` files in this directory.
