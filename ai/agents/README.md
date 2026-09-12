# Subagent routing (pi-subagents)

Demoted from `ai/AGENTS.md` on 2026-09-01 — reference material, read on demand.
The shared contract owns behavioral boundaries; the table lives here.

When a task calls for delegation — or a bigpowers skill references the "Agent
tool" — use the `subagent` tool. Five agents, one per phase of the cycle
(routing approved 2026-09-07; live evidence in
`~/plans/pi-agent-orchestration/2026-09-07-astra-routing-verification.md`):

| phase | agent | context | model:effort | writes | use when |
|---|---|---|---|---|---|
| ask → plan | `planner` (alias shaper) | fresh | fable-5-1:high → sol | plan / bigpowers specs only | the ask is vague; you want a scoped, decision-explicit plan before anyone codes |
| know | `researcher` | fresh | sonnet-5:high → opus-5 | brief only | facts from the repo (entry points, data flow, prior art) or the web (docs, specs, benchmarks) |
| build | `worker` (alias design-worker) | fresh | gpt-6-astra:high → sol | yes, single writer | scoped implementation; Figma via the `figma-design-to-code` skill with design context passed in the brief |
| check | `reviewer` | fresh | gpt-6-astra:high → opus-5 | no | judge an artifact: diff, plan, PR. Runs the verify commands itself |
| judge | `oracle` | **fork** | fable-5-1:high → gemini-3.1-pro-preview | no | judge the trajectory with the whole transcript — see triggers |

All five default to **high**; fallback models inherit that effort unless a suffix says
otherwise. `sol` means `openai/gpt-5.6-sol`; exact provider-qualified pins live in the
sibling agent files. These defaults target routine use without manual tuning, not a
measured 95% success rate. Sol is worker's availability fallback, not its normal model.
The pinned local pi-subagents package fixes the signed-Claude-fork effort downgrade;
reload older parent sessions before relying on it. See Package pin below.

Disabled builtins (settings.json): `scout` (merged into researcher), `delegate`
(inherited the parent's fable at 2–2.5× worker's price and got worker/reviewer jobs),
`gpt-pro` (needs the surf-oracle bridge).

Cadence: `worker → reviewer → worker → reviewer(scoped) …`, cap **3 fix rounds**, then
`oracle` ("wrong plan, noisy reviewer, or worker not reading?"), then David. First review
covers the whole change; re-review briefs name the prior findings and the verify commands
so the reviewer confirms and re-runs rather than re-explores. One reviewer per round by
default. On a risky final gate, a second reviewer can use
`reviewer[model=anthropic/claude-fable-5-1:high]` for a cross-provider check. Fresh-context
Astra is the normal reviewer, including for Astra-authored code; a second model is not
required on every change.

Oracle triggers, and only these: (1) before accepting a plan, (2) review-cycle cap hit,
(3) before an irreversible action (force-push, closing/merging a PR, publishing),
(4) before reversing a decision made earlier in the session. Never at sprint start (nothing
to compare), never as the end gate (reviewer, fresh). Cost is O(parent transcript).

Per-run overrides: `agent[model=provider/model:level]`, or a tool-call `model` field with
the same qualified string. A suffix such as `:medium` overrides the agent's high effort;
a model-only override retains high. Do not use the top-level `thinking` tool parameter
for dispatch; it is a watchdog-management setting.

## Delegation trial (approved 2026-09-12)

Trial the shared contract's five parent rules before changing model capabilities.
Main, worker, and reviewer remain Astra high; researcher remains Sonnet high;
planner/oracle remain Fable high. All fallbacks, tools, contexts, and gates stay unchanged.
Pi's global startup default is standard Astra below; existing sessions and project
settings can retain a different route.

At a self-contained phase boundary, use the existing managed STATE/log/inbox handoff.
Preserve the goal, decisions, refs, evidence, remaining work, and active-child ownership.
A successor checks HEAD, dirty files, and live writers before acting. `/resume` and
`/fork` retain history; they are not fresh-context handoffs. Use `ai/README.md` when
the managed updater is unavailable.

Evaluate total unique main-plus-child cost, including retries, review, and repairs,
against accepted scope, defects, missed constraints, and rework. Do not treat reduced
main-context size or child count as success alone. No model downgrade or automatic
session migration is part of this trial.

Installation evidence and guarded rollback:
`~/plans/pi-agent-orchestration/cost-optimizations/inbox/2026-09-12-trial-installation.md`.

## Conditional Astra 1M routing

Use `openai/gpt-6-astra:high` by default: its registered context window is **272000**
tokens. The orchestrator—not David—selects `openai-1m/gpt-6-astra:high` only when the
required instructions, evidence, output reserve, and expected tool results cannot fit
that window, and narrowing the brief would lose necessary evidence. It is the same
model with a **1000000**-token window, not a quality escalation. Do not globally expand
Astra through `models.json`.

Check the current model registry before the exceptional launch. The 1M provider comes
from the Shopify proxy extension; a stale process may not have it. If unavailable,
reload/restart and re-check rather than silently sending oversized work to standard
Astra. The stock harness does not promote overflow to 1M automatically. Worker still
has a 272K Sol fallback: it cannot rescue work that genuinely needs more context.
Inspect the actual fallback result and re-route such work; do not shrink away evidence.

Fable planner/oracle and Sonnet have 1M cards. Fable avoids Astra's price increase above
272K for the routinely large oracle transcript. For exact current prices use the model
registry, not the abbreviated table above.

Dispatch briefs name an absolute output path into the unit's `inbox/` and set the
runtime's explicit `output` to that same path, distinct per child. A prose filename
alone is not persistence. Read-only reviewer/oracle return their artifact; the runtime
or parent saves it, and the parent verifies the file exists. Children never use bash
to work around no-write instructions. bigpowers task_brief (goal, in_scope,
out_of_bounds, verify) remains the brief protocol.

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
  (`plan.md`) both had this. Omit `output:`; let the brief carry an absolute path.
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
The routing baseline passed 16 checks against the configured patched package, including
signature removal and effort preservation. The same signed-fork assertion fails against
stock 0.64.0. Contract inheritance now has its own portable assertion; `ai/tests/` adds
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

- `runs.all` children of the same agent type collide on that agent's default
  output path and all fail instantly. Pass an explicit distinct `output` per
  item. (2026-08-28, and again during the 2026-09-01 memory refinement.)
- `status.json` does not hold the full review. If explicit output persistence failed,
  recovery may be available via `output-archives/<runId>.json` → `session.jsonl` →
  assistant text. Verify the actual artifact instead of relying on the prose path.
- After upgrading packages, reload the parent before launching children. A parent
  holding a removed package version can launch stale absolute extension paths;
  `doctor` success does not prove child startup. Verify a real request.

Agent definitions themselves are the sibling `*.md` files in this directory.
