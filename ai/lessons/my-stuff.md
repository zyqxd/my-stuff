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

## Subagent defaults must work without manual tuning (2026-09-07)

- Correction: the first Astra routing proposal kept Sol as the default writer, prescribed frequent effort overrides, and proposed globally expanding Astra to 1M.
- Preference: David wants state-of-the-art Astra for coding even at higher cost. Fresh-context work can use Astra without routinely paying its long-context surcharge. Use the separate 1M option only when the task needs that capacity.
- Rationale: David rarely changes effort after configuration. Defaults should cover roughly 95% of tasks, rather than optimizing the easy case and relying on manual escalation. The 95% figure is a design target, not a measured success rate.
- Future action: choose a dependable effort default per role, automate exceptional routing where supported, and keep the standard and 1M Astra routes separate. Prefer another capable model for the routinely large-context oracle when Astra's >272K surcharge is not justified.
- Scope: personal Pi subagent routing. David subsequently approved Fable 5.1 planner/oracle, Sonnet 5 researcher, Astra worker/reviewer, all high; oracle keeps fork, worker fallback is Sol.
- Evidence: David's September 7 correction and subsequent approval. He explicitly prefers Astra for coding and the separate Astra 1M option when required; researcher remains Sonnet. Runtime verification must distinguish configured effort from the actual provider request.

## Keep the original outcome visible through design subtopics (2026-09-07)

- Feedback: after the footer's location redesign, David asked what `~19 ?8` meant and where aggregate pricing was. The original request was parent-plus-subagent spending; that remained unimplemented when the location slice shipped.
- Rationale: honing in on one part of a design does not withdraw the original outcome. Scope disclaimers did not make this partial delivery meet the original request. Unlabelled Git counts also failed the intended glanceability goal.
- Future action: carry the original outcome through subtopic approvals, distinguish completed slices from the remaining deliverable, and use readable labels for unfamiliar counters. Clarify disputed scope rather than silently treating a subtopic as the whole task.
- Scope/evidence: this footer discussion and David's post-reload feedback. Exact Git-label wording and the remaining pricing implementation are not settled by this lesson.

## Keep the constitution readable, not procedurally exhaustive (2026-09-07)

- Feedback: after the cross-model rewrite expanded the contract from 1,129 to 1,208 words, David requested independent review against the clean, concise Boris Cherny reference: https://raw.githubusercontent.com/maximus0411/BorisChernyClaudeMarkdown/refs/heads/main/CLAUDE.md.
- Rationale: less context cost matters, but the primary goal is clean thinking: avoid contradictions and minute details that do not improve results. Fewer lines alone do not prove concision.
- Future action: justify each always-loaded clause by the decision or observed failure it improves. Prefer short principles; move harness procedures to their owning references or roles instead of adding defensive caveats to the constitution. Preserve concrete safeguards and known preferences when cutting.
- Scope: the personal working contract and supporting agent system, not a license to shorten required error/security information or rewrite working files without approval. No exact word budget was specified; use the linked reference as the editorial lens, not as authority for its repo-local task paths.
