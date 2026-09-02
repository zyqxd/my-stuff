# Lessons — mona-catalog

Durable lessons for the #help-monetization LHF dashboard (browser-native on Quick; `site/` ships,
`legacy/` + `data/` are old Python-pipeline reference; per-site `quick.db`).

## L1 — Never trust `data/` for real volumes; it's a stale, truncated legacy snapshot (2026-07-15)
**Symptom (user caught it):** my "requests started per ATC shift" showed 12 for the Jun 22 shift; the
user's Slack search (`in:#help-monetization -threads:replies`, Exclude automations, Jun 22–29) showed
**101**. Huge gap.
**Root cause:** I ran the hand-off dry-run over `data/asks.jsonl` / `data/threads.jsonl`. That corpus is
a ~2-week legacy sample that **ends on Jun 22**, so the "Jun 22 shift week" (Jun 22–28) contained only
Monday's data → 12, not a real week. The metric logic was correct; the data was unrepresentative.
**Rules for myself:**
1. `data/` (and `legacy/`) are **reference only** — never the source of truth for counts/volumes. The
   live truth is the `asks` collection in the deployed site's `quick.db`, or a fresh scan.
2. Before quoting any count, state the corpus + its date coverage (min/max day) and whether it's the
   live data or a sample. A per-day/`per-shift` count near the corpus edge is almost certainly truncated.
3. When a user gives an independent number (e.g. a Slack search), reconcile it **explicitly** by
   definition deltas (heads vs replies, automations, roster, window/tz) before trusting either side.

## L2 — Read the live quick.db from the CLI via `quick curl` (no browser needed) (2026-07-15)
`quick.db` looks browser-only, but the client just POSTs to a REST endpoint you can hit headlessly:
- Query a collection: `quick curl -s '<site>/api/db/<collection>/query' -X POST -H 'Content-Type: application/json' -d '{}'`
  - body: `{}` = all; `{"select":"a,b,c"}` projects; `{"where":{...}}`, `{"limit","offset","orderBy"}` supported.
  - returns a **plain JSON array**; verify response completeness rather than assuming pagination or limits.
- `quick curl` injects IAP auth. Deployed static assets are also fetchable (`quick curl <site>/metrics.js`)
  — use this to verify a deploy shipped the intended code, and to verify a data migration (e.g. recompute
  every `date`/`week` and diff against stored values) **entirely from the CLI**. Beats waiting on a browser.

## L3 — `git add -A` swept uncommitted scratch into a feature commit (2026-07-15)
Writing throwaway analysis scripts under `tools/` then committing an unrelated fix with `git add -A`
silently included them (they rode into the merge to master). Not catastrophic (`tools/` doesn't ship —
`quick deploy` uploads `site/` only), but it committed scratch without a decision.
**Rule:** stage deliberately (`git add <paths>`), or decide scratch fate (keep in `tools/` vs delete)
**before** any `git add -A`. If a harness is worth keeping, commit it on purpose with a message saying so.

## Domain note — the ATC shift boundary (verified 2026-07-15)
Monetization "ATC" rotation = **weekly, Monday→Monday, on `America/Toronto` wall-clock** (DST-observing).
Verified from the rotation bot's "Monetization Combined Dev ATC this week is <name>" posts:
daily 08:56 America/Toronto greeting, new name appears Monday; summer post 12:56 UTC / winter 13:56 UTC.
All day/week buckets anchor to that tz via `metrics.dayKey` (the single source of truth), NOT UTC.

## L4 — Model evals need minimal wrappers and information-complete fixtures (2026-07-26)
**Symptom (user caught it):** the live automated-response canary used a vague synthetic head
("How can I correct this invoice?") wrapped in instructions that restated Mona's identity and
#help-monetization context. The pipeline worked mechanically, but the example could not be solved
from its input, so its quality result was meaningless.
**Rules for myself:**
1. Do not restate an agent's identity or irrelevant source channel in a prompt wrapper; include only
   instructions that change the requested output.
2. Pass only useful request content to the responder — omit synthetic timestamps/author labels when
   they add no decision-relevant information.
3. Eval fixtures must be sanitized but representative and information-complete: include the domain
   facts, constraints, desired decision, and a substantive reference solution.
4. Treat a green model pipeline over an unanswerable toy fixture as a failed eval, not evidence of
   capability; human usefulness review gates the canary.

## L5 — Materialize simple reference cases before evaluating prompts (2026-07-27)
**Symptom (user caught it):** e01s16 built a two-model, per-thread responder/judge pipeline with
3,000+ lines of code and tests, yet 21 evaluations took about 70 minutes and produced no useful
prompt-success measure.
**Rules for myself:**
1. Build a reusable `{inbound_request, resolution}` corpus first; synthesize the resolution once from
   the full thread and mark menial/off-thread outcomes ineligible.
2. Evaluate every candidate against that stable resolution, not the full conversation through a new
   judge workflow on every run.
3. Start with one local JSONL file, one CLI, one small ordinal rubric, and runtime primitives (Node 24
   already provides `WebSocket` and `fetch`); add storage or transport abstractions only after a real
   need appears.
4. Optimize for a useful, inspectable sample before processing the entire corpus or adding generic
   provenance, retry, provider, and orchestration layers.
5. Have hosted local Mona (`http://localhost:3847/#`, WebSocket `/ws`) synthesize each reference
   from transcript evidence only and score candidates; require an auditable 3–5 sentence technical
   resolution and reject status-only, off-thread, or unclear outcomes.
6. A streamed `tool_call` event is observation, not prevention: Mona can begin execution before the
   client reacts. Never claim tool-free safety without a server-side pre-execution veto.
7. Derive deployment boundaries from the module location, not `process.cwd()`; protect dangling final
   symlinks and open sensitive outputs with no-follow semantics.

## L6 — Treat repository freshness as a first-class integration requirement (2026-07-28)
**Symptom (user caught it):** I recommended copying Mona context into Vex before establishing that
continuous awareness of the changing Monetization repository was the core requirement.
**Rules for myself:**
1. Establish the authoritative source and freshness SLA before ranking agent integration options.
2. Never equate a copied prompt, Google Doc, or Q&A export with an agent that searches current repo state.
3. Verify what a hosted artifact contains and how it updates; never assume a deployment includes
   the full repository or refreshes automatically.
4. For repo-current answers, prefer one centralized agent endpoint backed by current-main retrieval
   (for example Grokt) or automated snapshot deploys, and return the source revision with every answer.

## L7 — Do not conflate repository retrieval with agent-context parity (2026-07-28)
**Symptom (user caught it):** I presented direct Grokt access as if it made Mona's context available to
Vex, when it actually bypasses Mona and lets Vex independently search one of Mona's information sources.
**Rules for myself:**
1. Separate agent context into fixed prompts/skills, retrieved evidence, conversation state, and tool behavior.
2. Ask whether the requirement is current source access, shared context assembly, or exact agent behavior before selecting transport.
3. Label POCs by what they prove: a Grokt registration proves Vex repo retrieval, not Mona integration.
4. When exact Mona context is required, keep context ownership in Mona and expose a versioned answer or context API; retrieval technology remains an internal Mona concern.

## L8 — Verify the deployed service boundary and initiative owner before building (2026-07-28)
**Symptom (user caught it):** I described a separate stateless Mona service while the POC actually added a route to the existing `mona-cloud` Node server, without first aligning with the active `mona.shopify.io` initiative owner or making the public-ingress authentication boundary explicit.
**Rules for myself:**
1. State exactly whether a POC creates a new process/service or adds a route to an existing deployed server.
2. Trace domain, load balancer/IAP, raw service URL, ingress, IAM, and application authorization separately before claiming service authentication is solved.
3. For public Cloud Run service-to-service traffic, require Google ID-token audience validation and `roles/run.invoker`; never treat an application-decoded JWT as independent cryptographic verification.
4. Search active issues, PR history, and the owning Slack channel before changing a hosted initiative; keep the PR draft-only and request owner alignment before merge or deployment.
5. Prefer a separate least-privilege service when interactive state, scaling, credentials, or IAM differ from the existing hosted product.

## L9 — Match architecture diagram type to the question (2026-07-28)
**Symptom (user caught it):** I used a flowchart for an end-to-end request/response interaction where participant order and handoffs were the important information.
**Rules for myself:**
1. Use Mermaid sequence diagrams for time-ordered cross-system flows; reserve flowcharts for topology, branching, and state transitions.
2. Match detail to the architectural boundary: collapse an owned subsystem into a black box when only its external contract matters.

## L10 — Separate transport choice from deployment topology (2026-07-29)
**Symptom (user caught it):** I justified a standalone answer service as avoiding Mona’s WebSocket protocol, conflating two independent decisions.
**Rules for myself:**
1. Decide the client contract independently: Vex should use stateless HTTP rather than emulate an interactive, session-oriented WebSocket protocol.
2. Decide co-location independently: HTTP and WebSocket routes can safely share one Node process when load, IAM, scaling, deployment cadence, and ownership permit.
3. Justify service separation through operational conflicts—scaling, resource isolation, IAM blast radius, deploy coupling, credentials, and SLOs—not protocol overlap.
4. Present same-service deployment as a valid pilot/low-volume option and require evidence before making separation mandatory.

## L11 — Separate answer-key authority from candidate scoring (2026-07-29)
**Symptom (user caught it):** I treated human validation of Mona’s fixed historical resolution as the reason for the 0–3 scalar, conflating reference quality with candidate performance.
**Rules for myself:**
1. Treat Mona’s full-thread resolution as the fixed authoritative answer key within this benchmark unless the user changes that contract.
2. Explain that 0–3 grades a candidate response against the answer key; it is not confidence in the resolution.
3. Describe human review as optional benchmark calibration or hardening, not as the purpose of candidate scoring.
4. Keep the three stages explicit: synthesize fixed answer key once, generate a candidate per prompt, score candidate coverage for comparison and optimization.

## L12 — Pick a judge threshold from the score cliff, never a priori (2026-08-18)
**Symptom:** I reached for a round judge threshold before looking at the distribution.
Vex's `BotAccuracy` (0–100, 6 bands in `config/bot_accuracy_ranges.yml`) is **bimodal in
production** — an 85–89 "rubber stamp" cluster against a 95–100 "actually great" cluster —
which is what puts `MINIMUM_GOLDEN_SCORE` at 95.
**Rules for myself:**
1. Plot the production distribution first; set the threshold at the cliff between clusters.
2. Skip accuracy scoring where it is circular — Vex skips it when `Resolution.kind == "bot"`
   or the channel is FAQ-mode, so the bot is never graded against itself or verbatim content.
**Scope:** any LLM-judge threshold in this project family, not only Vex.
**Source:** `~/plans/monet-slack/2026-08-18-prior-art-mona-atc-repos.md`, 2026-08-18.

## L13 — Rank resolution ground truth by false-positive rate, not by richness (2026-08-18)
Deterministic intake-bot **marker = 0 false positives** > conservative LLM assessment for
7-day-stale threads (`confidence ≥ 90` only) > free LLM opinion, which stays an advisory field
(~14% of threads resolve in-thread with no marker).
**Rule:** prefer the narrow deterministic signal as ground truth and let the model fill only the
residual, tagged as advisory.
**Source:** as L12.

## L14 — Freeze the reference once; re-run only candidate and scorer (2026-08-18)
**Symptom:** the regenerate-and-re-judge-every-run evaluator hit 3,000+ lines and ~70 min for 21
cases and produced no usable metric.
**Rules for myself:**
1. Synthesize the reference resolution **once** (3–5 sentences, ≤35 words each, cited transcript
   line numbers) and freeze it; per prompt version, re-run only candidate + scorer.
2. Score on 4 anchored tiers plus normalized completion `sum/(3×eligible)`.
3. Resume by `case_id` + `source_sha` + `prompt_hash`; a changed identity means a **new output
   file** — never mix runs.
**Source:** as L12 (mona-catalog e01s16).

## L15 — Never persist a partial or errored row over a good one (2026-08-18)
**Symptom:** ~885 rows corrupted — a failed categorization still wrote, and `quick.db.update()`
**merges**, so stale labels survived next to fresh provenance and looked authoritative.
**Rule:** on the error path, write nothing. A merging update makes a partial write worse than no
write, because the row keeps the shape of a good one.
**Source:** as L12. #bug
