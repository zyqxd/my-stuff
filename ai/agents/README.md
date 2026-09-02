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

## Config traps (full roster scan, 2026-09-01)

- **A declared tool name does not load the code that registers it.** `tools:` is a strict
  allowlist. An *unknown* name fails the launch loudly ("requested unavailable child
  tools"); a *known builtin* name whose provider is missing is dropped **silently** and the
  agent carries on without it. `web_search`, `fetch_content`, `get_search_content` are in
  pi-subagents' read-only builtin set, so `researcher` silently lost them for weeks and
  answered from memory. They need `npm:pi-web-access` (in `setup.sh`; zero-config search
  via Exa MCP, no key required). Verified working 2026-09-01.
- **MCP direct tools cannot reach a child without `pi-mcp-adapter`.** `get_design_context`
  and `get_screenshot` come from the Figma MCP server and exist only in the orchestrator's
  session. `design-worker` declared them and therefore **failed every launch**. Pointing
  `subagentOnlyExtensions` at `pi-figma-mcp/index.ts` does not help — that file starts an
  MCP server, it does not register tools. The orchestrator calls them and passes the
  result in the brief.
- **`bash` makes an agent mutation-capable**, so a read-only advisor needs
  `completionGuard: false` (and `acceptanceRole: read-only`) or it is judged an
  implementation agent. `reviewer` and `researcher` had it; `oracle` did not.
- **Never use `~` in `subagentOnlyExtensions`.** `pi-args.ts` forwards the value to `-e`
  with no tilde expansion. Absolute paths only.
- **Never give an agent a relative `output:` in frontmatter.** It resolves against the cwd,
  so the child writes into whatever repo the parent is in — and it silently overrides the
  absolute path in the dispatch brief. `researcher` (`research.md`) and `shaper`
  (`plan.md`) both had this. Omit `output:`; let the brief carry an absolute path.
- **`defaultContext: fork` forces `thinking: off` for an Anthropic child.** Forking
  sanitizes the parent's signed thinking blocks and an Anthropic child cannot resume such
  a transcript with thinking on. `oracle` is pinned `anthropic/claude-fable-5` with
  `thinking: xhigh` and runs at **off** on its default path; the same launch with
  `context: fresh` runs at `xhigh`. Unresolved trade-off — fork buys inherited state and
  costs the reasoning that is oracle's whole purpose. Pass `context: "fresh"` and put the
  state in the brief when the verdict needs depth.
- **Relative `defaultReads` miss our layout.** `worker` and `design-worker` read
  `context.md, plan.md` relative to cwd, but briefs put those in
  `~/plans/<project>/<unit>/inbox/`. Harmless when absent, but they never fire. Left as-is.
- Model pins are provider-qualified in both `~/.pi/agent/settings.json` and `setup.sh`,
  and no agent sets `extensions:` (which would set `disableAmbientExtensions` and kill the
  shopify-proxy provider in the child). Both verified clean.

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
