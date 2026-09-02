# my-stuff / memory system

## Memory-home decisions favor brain consolidation (2026-08-04)

- Failure: recommended keeping `~/plans` as a standalone local git repo after
  weighing migration cost vs gain; David overrode — plans belong in the brain
  personal bank.
- Rationale: he prioritizes one consolidated memory system over migration-cost
  and workflow-fit arguments; local-only version control is sufficient, and no
  remote is planned for personal memory (bank or plans).
- Future: for memory/workflow-architecture choices, default to consolidating
  into brain; present trade-offs, but treat "fewer homes" as the tiebreaker.
- Scope: my-stuff working agreement, `~/plans`, `~/.brain`.

## `runs.all` children of one agent type collide on the default output path

Source: 2026-08-28 (#7241 plan-work, twice), and again on 2026-09-01 launching four
parallel `scout`s for the memory-refinement audit.

A subagent's `output` default is per-agent-type, not per-invocation. Two `scout`s in
one `runs.all` both resolve to `<cwd>/context.md`, and the workflow fails every child
immediately with "resolve output to the same path" — including the children whose keys
did not collide.

- **Future action:** when a `runs.all` batch repeats an agent type, give every item an
  explicit distinct `output` absolute path. Cheapest to do it unconditionally.
- The failure is loud and instant, so the cost is a wasted launch, not a wrong result.
