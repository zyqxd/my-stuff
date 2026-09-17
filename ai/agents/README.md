# Subagent routing (pi-subagents)

Demoted from `ai/AGENTS.md` on 2026-09-01 — reference material, read on demand.
The shared contract owns behavioral boundaries; the table lives here.

When a task calls for delegation — or an explicitly invoked bigpowers workflow
references the "Agent tool" — use the `subagent` tool. Five agents, one per phase of
the cycle (routing updated 2026-09-17; prior live evidence remains historical in
`~/plans/pi-agent-orchestration/2026-09-07-astra-routing-verification.md`):

| phase | agent | context | model:effort | writes | use when |
|---|---|---|---|---|---|
| ask → plan | `planner` (alias shaper) | fresh | fable-5-1:high → gpt-6-astra | plans; bigpowers specs only when invoked | the ask is vague; you want a scoped, decision-explicit plan before anyone codes |
| know | `researcher` | fresh | sonnet-5:high → gpt-5.6-luna | brief only | facts from the repo (entry points, data flow, prior art) or the web (docs, specs, benchmarks) |
| build | `worker` (alias design-worker) | fresh | gpt-5.6-sol:high → opus-5 | yes, single writer | scoped implementation; Figma via the `figma-design-to-code` skill with design context passed in the brief |
| check | `reviewer` | fresh | opus-5:xhigh → gpt-5.6-sol:xhigh | no | judge an artifact: diff, plan, PR. Runs the verify commands itself |
| judge | `oracle` | **fork** | gpt-6-astra:high → fable-5-1 | no | judge the trajectory with the whole transcript — see triggers |

Worker, researcher, planner, and oracle default to **high**; reviewer defaults to
**xhigh**. Each role has one cross-provider fallback in the same tier: premium is
Astra/Fable, high is Sol/Opus 5, and cheap is Luna/Sonnet. Each unsuffixed fallback
inherits the role's effective effort, including per-run overrides. Exact
provider-qualified pins live in the sibling agent files. These defaults target routine use without manual tuning, not a
measured success rate. The pinned local pi-subagents package fixes the signed-Claude-fork
effort downgrade; reload older parent sessions before relying on it. See Package pin below.

Disabled builtins (settings.json): `scout` (merged into researcher), `delegate`
(inherited the parent's fable at 2–2.5× worker's price and got worker/reviewer jobs),
`gpt-pro` (needs the surf-oracle bridge).

Cadence: `worker → reviewer → worker → reviewer(scoped) …`, cap **3 fix rounds**, then
`oracle` ("wrong plan, noisy reviewer, or worker not reading?"), then David. First review
covers the whole change; re-review briefs name the prior findings and the verify commands
so the reviewer confirms and re-runs rather than re-explores. One reviewer per round by
default. Fresh-context Opus 5 at xhigh is the normal reviewer, including for
Opus-authored code; its automatic Sol xhigh fallback covers availability. A second model
is not required on every change.

Oracle triggers, and only these: (1) before accepting a plan, (2) review-cycle cap hit,
(3) before an irreversible action (force-push, closing/merging a PR, publishing),
(4) before reversing a decision made earlier in the session. Never at sprint start (nothing
to compare), never as the end gate (reviewer, fresh). Cost is O(parent transcript).

Per-run overrides: `agent[model=provider/model:level]`, or a tool-call `model` field with
the same qualified string. A suffix such as `:medium` overrides the role's authored
effort; a model-only override retains that effort. Do not use the top-level `thinking`
tool parameter for dispatch; it is a watchdog-management setting.

## Delegation trial (approved 2026-09-12; child routing superseded 2026-09-17)

The trial began by testing the shared contract's five parent rules before changing model
capabilities. Main, worker, and reviewer were Astra high; researcher was Sonnet high;
planner/oracle were Fable high. The current table supersedes those child routes while
keeping the trial's tools, contexts, and gates unchanged. Main and Pi's global startup
default remain standard Astra high; existing sessions and project settings can retain a
different route.

At a self-contained phase boundary, use the existing managed STATE for continuity;
add a handoff artifact only when needed. Preserve the goal, decisions, refs, evidence,
remaining work, and active-child ownership for the successor.
A successor checks HEAD, dirty files, and live writers before acting. `/resume` and
`/fork` retain history; they are not fresh-context handoffs. Use `ai/README.md` when
the managed updater is unavailable.

Evaluate total unique main-plus-child cost, including retries, review, and repairs,
against accepted scope, defects, missed constraints, and rework. Do not treat reduced
main-context size or child count as success alone. The original trial made no model
downgrade or automatic session migration.

Installation evidence and guarded rollback:
`~/plans/pi-agent-orchestration/cost-optimizations/inbox/2026-09-12-trial-installation.md`.

## Conditional Astra 1M routing

Main remains on `openai/gpt-6-astra:high`, whose registered context window is **272000**
tokens. For any Astra run, the orchestrator—not David—selects
`openai-1m/gpt-6-astra:high` only when the required instructions, evidence, output
reserve, and expected tool results cannot fit that window, and narrowing the brief would
lose necessary evidence. It is the same model with a **1000000**-token window, not a
quality escalation. Do not globally expand Astra through `models.json`.

Check the current model registry before the exceptional launch. The 1M provider comes
from the Shopify proxy extension; a stale process may not have it. If unavailable,
reload/restart and re-check rather than silently sending oversized work to standard
Astra. The stock harness does not promote overflow to 1M automatically. Planner's
base-provider Astra fallback also stays at 272K. When oracle's required fork context
cannot fit 272K, select `openai-1m/gpt-6-astra:high` before launch; context overflow does
not trigger its Fable fallback. Inspect the actual result and re-route oversized work
rather than dropping evidence.

Fable, Sonnet, and Opus 5 have 1M cards. Astra, Luna, and Sol have 272K cards. A fallback
therefore does not guarantee the primary's context capacity: researcher, reviewer, and
planner can fall back to a narrower window, while worker and oracle have larger Claude
fallbacks. For exact current prices use the model registry, not the abbreviated table above.

Return concise findings and decisive evidence in chat by default; no per-child inbox
file is required. If the runtime needs output artifacts, use temporary paths outside
source checkouts. For a requested, required, or genuinely needed durable handoff, name
an absolute unit `inbox/` path in the brief and set the runtime's explicit `output` to
match, distinct per child. A prose filename alone is not persistence. Read-only roles
return their artifact; when persistence is needed, the runtime or parent saves it and
the parent verifies the file exists. Children never use bash to work around no-write instructions.
When bigpowers is explicitly invoked, its task_brief (goal, in_scope, out_of_bounds,
verify) remains the brief protocol.

## Shared contract delivery

All five roles inherit the shared contract and add role-specific duties. Keep both
context-inheritance flags enabled. See `ai/README.md` → **What loads** for native
loading and verification; the contract separates parent duties from all-agent rules.

## Config traps (full roster scan, 2026-09-01)

- Stock `parallel-research` and `gather-context-and-clarify` prompts still name the
  disabled `scout`. Inspect such prompts before use and route fact-finding to researcher;
  this setup does not rewrite third-party prompts or adopt unversioned local skills.
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
  implementation agent. These flags classify completion; they do **not** enforce a
  read-only sandbox. A medium-effort oracle probe used bash to write its report despite
  a no-shell instruction. The existing tool boundaries were not changed by this retune.
- **Never use `~` in `subagentOnlyExtensions`.** `pi-args.ts` forwards the value to `-e`
  with no tilde expansion. Absolute paths only.
- **Never give an agent a relative `output:` in frontmatter.** It resolves against the cwd,
  so the child writes into whatever repo the parent is in — and it silently overrides the
  absolute path in the dispatch brief. `researcher` (`research.md`) and `shaper`
  (`plan.md`) both had this. Omit frontmatter `output:`; when an output path is needed,
  use an absolute runtime path that matches the brief.
- **Stock 0.64.0 can silently reduce signed-fork effort.** Removing signed Claude
  thinking can force `:off`; Pi 0.84.3 clamps Fable's unsupported off to minimal and
  sends adaptive **low**, not the API default. The installed local patch skips that
  override when `thinkingLevelMap.off === null`, while still stripping signatures.
  Full dispatch from a fresh Pi process verified high and an explicit medium override
  with HTTP 200. Off-capable Anthropic models and unknown models remain conservative;
  an off-capable Anthropic fallback can still force off for the entire candidate chain.
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
- **Settings overrides beat custom frontmatter in 0.64.0.** Per-run model overrides
  win, then project/user role overrides (including provider-scoped overrides), then
  frontmatter, then defaults/parent inheritance. Keep this roster's normal pins in
  the agent files; `setup.sh` removes legacy role overrides so they cannot mask them.
  A global `defaultSubagentContext` can also replace agent context preferences. Use
  explicit `context: "fork"` when the oracle must have a persisted parent; implicit
  fork otherwise falls back to fresh when no parent file/leaf exists.
- Context overhead varies with the role and installed skills/extensions. September 7
  fresh-role first requests used roughly 20K–35K input/cache tokens before tool results;
  the earlier ~43K estimate is not a fixed launch cost.
- Model pins are provider-qualified, and no agent sets `extensions:` (which would set
  `disableAmbientExtensions` and kill the shopify-proxy provider in the child).

## Verification

Run `node --test ai/agents/tests/routing.test.mjs` for the portable roster checks. From
inside Pi, `node --test ai/agents/tests/*.test.mjs` also checks the installed runtime,
settings precedence, suffixes, context preferences, model cards, and fallback rules.
The routing suite checks the configured patched package, including signature removal,
effort preservation, supported effort levels, and provider/tier pairs. The same
signed-fork assertion fails against stock 0.64.0. Contract inheritance has its own
portable assertion; `ai/tests/` adds
actual installed loader and resolved child-prompt rewrite checks, separate from behavior
evals. See `ai/README.md` for commands and explicit skip conditions.

Live request evidence distinguishes configured values from provider payloads and
responses. Availability fallback covers eligible model/startup failures, not weak
answers, context overflow, tool-task failures, or failures after tool execution.

## Package pin

`~/.pi/agent/settings.json` selects
`local-packages/pi-subagents-0.64.0-fork-effort`, relative to `~/.pi/agent/`.
This is an independent package copy with its four pinned runtime dependencies; npm's
managed copy is not edited or required after installation. Automatic package updates
will not advance this local copy.

`node ai/install-subagents.mjs` installs it; `setup.sh` calls the same installer.
The installer checks the exact stock and patched source hashes, preserves an existing
copy, and refuses unexpected source changes. The one-line patch is versioned at
`ai/patches/pi-subagents-0.64.0-fork-effort.patch`. Reload running Pi sessions after
changing package sources; a fresh process uses the selected package immediately.

To roll back to the exact stock release (which restores the effort defect):

```sh
pi remove "$HOME/.pi/agent/local-packages/pi-subagents-0.64.0-fork-effort"
pi install npm:pi-subagents@0.64.0
```

Then reload. To return to upstream updates permanently, also remove the local installer
call from `setup.sh` and restore its npm entry after an upstream release passes the
signed-fork regression. Do not merely update npm while the local source remains selected.

## Operational notes

- `runs.all` children of the same agent type collided on that agent's default output
  path and all failed instantly (2026-08-28, and again during the 2026-09-01 memory
  refinement). Where the runtime needs explicit outputs to avoid this, use distinct
  temporary paths unless durable retention is needed.
- `status.json` does not hold the full review. If explicit output persistence failed,
  recovery may be available via `output-archives/<runId>.json` → `session.jsonl` →
  assistant text. Verify the actual artifact instead of relying on the prose path.
- After upgrading packages, reload the parent before launching children. A parent
  holding a removed package version can launch stale absolute extension paths;
  `doctor` success does not prove child startup. Verify a real request.

Agent definitions themselves are the sibling `*.md` files in this directory.
