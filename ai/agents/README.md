# Subagent routing (pi-subagents)

Demoted from `ai/AGENTS.md` on 2026-09-01 — reference material, read on demand.
The constitution keeps only the two imperatives; the table lives here.

When a task calls for delegation — or a bigpowers skill references the "Agent
tool" — use the `subagent` tool. Five agents, one per phase of the cycle
(retuned 2026-09-04, see `~/plans/pi-agent-orchestration/2026-09-04-subagent-roster-tuning.md`):

| phase | agent | context | model:effort | writes | use when |
|---|---|---|---|---|---|
| ask → plan | `planner` (alias shaper) | fresh | fable-5:high | plan / bigpowers specs only | the ask is vague; you want a scoped, decision-explicit plan before anyone codes |
| know | `researcher` | fresh | sonnet-5:high | brief only | facts from the repo (entry points, data flow, prior art) or the web (docs, specs, benchmarks) |
| build | `worker` (alias design-worker) | fresh | sol:xhigh → opus-5 | yes, single writer | scoped implementation; Figma via the `figma-design-to-code` skill with design context passed in the brief |
| check | `reviewer` | fresh | sonnet-5:high → opus-5 | no | judge an artifact: diff, plan, PR. Runs the verify commands itself |
| judge | `oracle` | **fork** | openai/sol:xhigh → openai/terra | no | judge the trajectory with the whole transcript — see triggers |

Disabled builtins (settings.json): `scout` (merged into researcher), `delegate`
(inherited the parent's fable at 2–2.5× worker's price and got worker/reviewer jobs),
`gpt-pro` (needs the surf-oracle bridge).

Cadence: `worker → reviewer → worker → reviewer(scoped) …`, cap **3 fix rounds**, then
`oracle` ("wrong plan, noisy reviewer, or worker not reading?"), then David. First review
covers the whole change; re-review briefs name the prior findings and the verify commands
so the reviewer confirms and re-runs rather than re-explores. One reviewer per round by
default. Two in parallel — add `reviewer[model=openai/gpt-5.6-sol:high]` for recall — only
on a risky final gate or when the change was authored by a Claude model (the parent's own
edits): same-family review adds cost without gain, and Sol reviewing Sol is self-review.

Oracle triggers, and only these: (1) before accepting a plan, (2) review-cycle cap hit,
(3) before an irreversible action (force-push, closing/merging a PR, publishing),
(4) before reversing a decision made earlier in the session. Never at sprint start (nothing
to compare), never as the end gate (reviewer, fresh). Cost is O(parent transcript).

Per-run overrides: `agent[model=provider/model:level]`, e.g.
`researcher[model=anthropic/claude-opus-5:xhigh]` for deep external research.

Dispatch briefs give each child an explicit absolute output path into the unit's
`inbox/` (`~/plans/<project>/<unit>/inbox/`) — e.g.
`/Users/david.yq.zhang/plans/improve-cancellation-reactivation/7529/inbox/researcher-context.md`
— never a relative path or one the child invents. bigpowers task_brief format (goal,
in_scope, out_of_bounds, verify) remains the brief protocol.

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
- **A fork forces `thinking: off` only for Anthropic children** (`fork-context.ts`
  `forkedChildRequiresThinkingOff`): the parent's signed thinking blocks are sanitized out,
  and an Anthropic child cannot resume such a transcript with thinking on. If the child's
  primary model *or any fallback* is Anthropic (or unresolvable), thinking is off; a
  non-Anthropic chain keeps its level. `oracle` is therefore pinned `openai/gpt-5.6-sol`
  with an `openai/gpt-5.6-terra` fallback. Sol's base card is 272k, so a fork of a parent
  past ~250k fails — pass `context: "fresh"` with the state in the brief instead. Verify on a
  run: the child's `thinking_level_change` entry in its `session.jsonl`.
- **Pin agents to base providers only** (`anthropic/…`, `openai/…`). `openai-1m`,
  `anthropic-flex`, `openai-flex`, `fireworks` are registered by the toolchain's proxy
  extension and exist only in its current version; a pi process started before a toolchain
  update, and every child it spawns, loads the older extension and reports `Model … not
  found` (2026-09-06: oracle on `openai-1m/gpt-5.6-sol` failed every launch from sessions
  started 3 days earlier).
- **Personal proxy tokens expire after ~24h and children inherit the parent's env.** A
  multi-day session can keep working while every child fails with `No API key found for
  anthropic` or an OpenAI 401 on a `shopify-…` key. Restart pi, or enable
  `ai-proxy-credential-manager` (`/pkg add ai-proxy-credential-manager`, ships in shop-pi-fy)
  so long-running sessions refresh in-process.
- **Frontmatter beats `agentOverrides`, field by field** (`agents.ts` `fill()` is gated by
  `agentHasFrontmatterField`). Every active agent is a custom file whose frontmatter pins
  `model`, `fallbackModels`, and `thinking`, so settings.json cannot change them — edit the
  file. settings.json carries only `disabled` for builtins; `setup.sh` drops legacy pins
  for roster agents so they do not linger and mislead a reader.
- Every child gets ~43k tokens of project context (CLAUDE.md + Brain) cache-written on turn
  one — $0.54 on Fable, ~$0.11 on Sonnet. It is the largest fixed cost of a short run.
- Model pins are provider-qualified, and no agent sets `extensions:` (which would set
  `disableAmbientExtensions` and kill the shopify-proxy provider in the child).

## Operational notes

- `runs.all` children of the same agent type collide on that agent's default
  output path and all fail instantly. Pass an explicit distinct `output` per
  item. (2026-08-28, and again during the 2026-09-01 memory refinement.)
- A reviewer's output lives only in its session transcript, not `status.json`:
  `output-archives/<runId>.json` → `session.jsonl` → longest assistant text block.
- An async workflow with a failed child cannot be stopped — `interrupt` is
  unsupported and `stop` refuses. Wait on a new run id.

Agent definitions themselves are the sibling `*.md` files in this directory.
