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
- **pi has no web-search tool.** `web_search`, `fetch_content`, and `get_search_content`
  do not exist in pi 0.84.3 — every hit for those names in the runtime is vendor SDK code
  (Anthropic server-side tool types, Google genai, the OpenAI usage endpoint). There is no
  pi setting for one, no tool-gateway web-search backend, and the only MCP server is Figma.
  `researcher` declared all three until 2026-09-01; since `tools:` is a strict allowlist,
  it silently resolved to `read, write` (+ `contact_supervisor`) and answered from memory.
  It now uses `bash` + `curl`, verified 2026-09-01 over 13 fetches.
- **Network access is `curl`, so discovery search is the gap, not retrieval.** Guess the
  canonical source; Mintlify/GitBook docs serve `<page>.md` and `/llms.txt` indexes.
  Keyless search scraping does not work — DuckDuckGo lite and html both return challenge
  pages. Real search needs an API key (Brave/Tavily/Exa); `researcher` picks one up
  automatically from the environment if it is ever set.
- **Never give an agent a relative `output:` in frontmatter.** It resolves against the
  cwd, so the child writes into whatever repo the parent happens to be in — and it
  overrides the absolute path in the dispatch brief. `researcher` had `output: research.md`
  and dropped a file into the my-stuff checkout on 2026-09-01. Omit `output:` and let the
  brief specify an absolute path.
- A reviewer's output lives only in its session transcript, not `status.json`:
  `output-archives/<runId>.json` → `session.jsonl` → longest assistant text block.
- An async workflow with a failed child cannot be stopped — `interrupt` is
  unsupported and `stop` refuses. Wait on a new run id.

Agent definitions themselves are the sibling `*.md` files in this directory.
