# Lessons — World zone: `//areas/clients/admin-web`

Durable, version-controlled lessons for the admin-web zone. Review at session
start; append after any correction. (Moved out of the in-repo `tasks/lessons.md`
— see "Memory & Learnings Location" in the global CLAUDE.md for why.)

---

## Don't patch a small state machine one failure-path at a time (whack-a-mole)

Source: PR #899093 + stacked #906638 (ACH bank accounts in subscription
checkout), 2026-07-02 → 07-10. One ~40-line block in
`Checkout/hooks/useInitialPaymentMethod.tsx` drew \*\*6 consecutive binks findings

- 3 human findings across ~14 `fix(checkout)` commits over 8 days\*\*, plus a
  recurrence in the stacked PR — all the same bug class.

What happened: the parent hook re-derived "which payment method is selected"
with its own ad-hoc `primary-or-first` logic that kept **drifting from (a) what
the `MultiplePaymentMethodSelector` actually displays and (b) what the CTA gate
requires**. The selection state depends on a _matrix_ of inputs — active method
type × verification status × per-account currency eligibility × other saved
methods (card / Identity card) × express-pay × `shouldEditPayment`. Each fix
addressed one cell and left an adjacent cell broken:

1. gate unverified/ineligible banks in the item list → _preselection_ still
   picked an unusable bank.
2. filter `selectableBankAccounts` for the no-active-id fallback → the
   _active-id_ path still kept an unusable bank selected.
3. gate the CTA on a valid bank id → a bank+card account now got **stuck** (CTA
   disabled while a card looked selected) — this was the recurrence in #906638.
4. a fallback fix put a **`useMemo` inside an `else` branch** → hook-order
   violation, crash on refetch.

The cascade only ended when the fallback stopped re-deriving and **reused the
selector's own rule as the single source of truth**:
`buildCheckoutPaymentMethods(...)` → `getDefaultSelectedId(items)`. Now parent
selection, the selector's highlighted item, and the CTA gate read the same list

- same rule, so they can't disagree.

Rules for myself:

- **Model the whole truth table before touching a stateful selection/eligibility
  bug.** Enumerate the input dimensions, find the one derivation that satisfies
  every cell, write it once. Never fix a single failure path in isolation.
- **Two surfaces that must agree on a derived value must call one shared
  function.** Parent state, a child component's visual default, and a
  gate/CTA must not each re-derive "primary-or-first" — divergent re-derivation
  was the root cause of nearly every finding here.
- **Test the matrix, not the cell.** Every fix shipped a test for its own case;
  the reachable bugs were always the _mixed_ cases (unusable bank + valid card).
  Parametrize across the cross-product, especially mixed-inventory accounts.
- **Never put a hook (`useMemo`/`useState`/`useEffect`) inside a conditional
  branch.** Compute conditional values with plain functions at the top level.
- **A repeat binks finding on the same file/locus is a design smell, not another
  patch.** After the 2nd finding on one block, stop and redesign toward a single
  source of truth instead of patching path #3, #4, #5.

## Promoted code-review conventions

Source: reviewer feedback on PR #899093 (2026-07-09).

- Comments should explain only a non-obvious constraint or trade-off; refactor or rename instead of narrating the code, and put test intent in `it(...)`/`describe(...)` names.
- Match the section's established file organization instead of creating a one-off variation; change every instance together if the pattern must change.
- Keep discriminating fixture data legible at the assertion site.

The global commandments carry these rules; this section retains their source evidence.

## Core (`//areas/core/shopify`) auto-reformats `db/data/*.yml` on save

A file watcher (started by core `dev up`) rewrites YAML data files (e.g.
`api_changes.yml`, `dynamic_experiments.yml`) shortly after they're saved —
converting `"..."` → `'...'` across the whole file. This produced a 4700-line
spurious diff.

- First verify the target files have no pre-existing working-tree changes.
- Edit + `git add` + commit **atomically in one bash command** (beat the debounce),
  then guard on `git diff --cached --numstat` before committing.
- Restore only watcher-generated unstaged changes afterward
  (`git restore --worktree -- <files>`); never discard pre-existing work.

## Fresh World worktrees have no generated GraphQL/TS declarations

`dev up --bare` does NOT start the dts daemon, so type-check fails with
"Cannot find module '\*.graphql'" / cross-project `.d.ts` missing.

- `pnpm run -r ... generate-dts` (packages) + `node scripts/typescript/generate-dts.ts <files>`
  (app projects) + `pnpm run refresh-graphql document-types` (generates `*.graphql.d.ts`).
- `changed-files.sh` chokes on untracked non-TS files (e.g. a stray `tasks/todo.md`); pass
  explicit admin-web-relative paths instead. (Keeping scratch/lessons out of the
  checkout — per the new memory location — also avoids this.)

## Removing a core GraphQL field consumed by admin-web = 3 single-zone PRs

Cross-zone PR restriction forbids one PR touching core + admin-web. Order:
admin-web (stop selecting) → core (remove field + regen `admin_schema_*` dumps) →
admin-web (`refresh-graphql` / resync `protocols/graphql/core.*` + `core-types`).
Reverse schema-dump hunks precisely from the field-add commit; verify against
_current_ content (`.graphql` sorts fields alphabetically, `.json` uses definition order).

## PR description corrections from the B2M and Stripe Express stacks

Sources: B2M CTA restack (#907101/#915894), 2026-07-13; user edits to Stripe Express #937049, 2026-07-15.

- In the B2M stack, preserve useful headings and per-file bullets while replacing explanatory paragraphs; do not over-correct into an unstructured blurb.
- Read the current GitHub body before editing because the user may have changed it; when authorship is ambiguous, inspect `pullRequest.userContentEdits { editedAt diff }` before overwriting.
- In #937049, linked product/user motivation needed to precede mechanics; stack-history narration was noise, and testing had to claim only verification performed for that PR.
- Explain compatibility decisions in reviewer terms, and prefer concrete reader language such as `2+` instead of symbolic `N`.
- Treat those headings and ordering as case evidence, not a universal template; choose sections that orient reviewers to the current change.

## Stripe Express ready metrics — trace component nesting before claiming a metric gap

- Do NOT analyze paired-metric emission (ReadyResult vs ReadyDuration) by reading
  each file in isolation. `ExpressPayButtons` (Billing/Subscribe) RENDERS
  `StripeExpressApplePay/GooglePay` → `StripeExpressAdminCheckout` and wires
  `onReady={handleApplePayReady}`. On a successful load the INNER
  `StripeExpressAdminCheckout.handleReady` emits Duration, then calls `onReady`
  which makes the OUTER `ExpressPayButtons` emit Result(success). Both fire once —
  the metrics ARE paired across the parent+child. Trace `onReady`/callback nesting
  before asserting "this surface emits X but not Y".
- Product fact: there is NO standalone "add Apple Pay / Google Pay as a payment
  method" flow. Stripe Express wallets only render when the merchant/device
  actually has that wallet set up (availability-gated). Don't invent an
  "add payment method" surface for StripeExpressAdminCheckout — it is only the
  inner button nested under ExpressPayButtons on the billing checkout page.
- Consequence: real ReadyResult/ReadyDuration discrepancies are narrow
  (label mismatch: Result carries `surface`, Duration doesn't; duration value
  skew across paths; rare double-ready/late-ready count edges), NOT the
  "success emits only one metric" gap I wrongly reported first.

## Keep development-only changes off real PR branches

Source: Stripe Express ready-metrics stack, 2026-07-16; the same temporary tophat patch reached real branches twice.

- Before committing or pushing after cherry-picked tophatting, inspect recent commits and the branch diff for `[DO NOT MERGE]` markers or development-only helpers; remove them first.
- Verify the pushed diff contains no development-only files; correct the branch immediately if one escaped.

## Honor the #937051 review handoff contract

Source: user correction on Stripe Express #937051, 2026-07-16. Added prop/test comments despite standing workstream guidance and replied to binks twice; the same handoff required review fixes to be squashed.

- For this workstream, add no code or test comments unless explicitly requested; use clear names and test descriptions instead.
- Do not reply to Binks or poll/wait for its re-review; fix the code, push, and hand off immediately. David will surface any new Binks comments.
- Squash review fixes into one clean commit per PR before handoff.

## Do not retain synonymous metric labels without auditing reporting consumers

Source: user correction on Stripe Express ready-metric PR #937049, 2026-07-27.

I retained both `surface` and `source` on
`StripeExpressPayElementReadyResult` as a compatibility hedge. They carried the
same Admin-versus-Signup value, creating two names that could conflict and no
single reporting contract. The right approach was to make `source` canonical
and audit downstream reporting before removing `surface`.

Rules for myself:

- **One semantic dimension gets one metric label.** Do not preserve synonymous
  labels indefinitely to avoid a migration; choose the canonical label and
  migrate consumers.
- **Before changing a metric label, use Monitoring API metric references** to
  inventory every alert, SLO, and Grafana dashboard, then inspect each exact
  expression/panel query.
- **Do not globally replace same-named labels.** ReadyResult `surface` was
  redundant, while `merchantCheckoutEvent.surface` has a separate valid
  taxonomy (`optional_checkout`, `admin_checkout`, trial-reactivation flows).
- **Plan the historical-series transition.** If old series have only the legacy
  label, use a temporary dual-read/normalization query through the longest alert
  window; otherwise the schema cleanup creates a monitoring blind spot.
- **Do not add a new alert dimension casually.** Grouping by `wallet` changes
  the per-series sample floor and alert sensitivity; measure volume and
  recalibrate thresholds separately from the label rename.

## Do not defer a directly related, low-risk metric schema correction mechanically

Source: user correction on Stripe Express ready-metric PR #937051, 2026-07-28.

I treated a reviewer's "non-blocking; include it in the follow-up" wording as a
reason not to fix a high-cardinality `duration` label in the active emission PR.
That was too deferential: the PR already touches every emitter, and removing the
redundant label is small, cohesive, and safer before emission volume expands.

Rules for myself:

- A reviewer allowing a follow-up is permission, not a requirement. Evaluate
  whether the active PR is the cleaner place to fix the issue.
- When a PR expands a metric's emission and exposes a redundant high-cardinality
  label, prefer removing it in that PR if all emitters and types are already in
  scope.
- Verify alerts, SLOs, and exact dashboard queries first; if no consumer filters
  or groups by the label, do not invent compatibility risk to justify deferral.

## Keep review fixes scoped to the reviewed emission condition

Source: user correction on Stripe Express ready-metric PR #937051, 2026-07-28.

When reviewing removal of synthetic ReadyDuration samples from timeout effects, I
expanded into redesigning how real `onReady` durations could be captured after a
timeout. That was outside the requested comment and obscured the actual consistency
requirement across Admin and Signup.

Rules for myself:

- If a review comment targets timeout emission, limit the fix and discussion to
  timeout emission unless the user explicitly asks to redesign normal readiness.
- State shared-path coverage explicitly: `useExpressPayConfig` serves both Signup
  and MerchantCheckout, while `ExpressPayButtons` is the separate Admin Billing path.
- Do not turn an adjacent observability idea into scope for the active review fix.

## Keep semantic booleans in component APIs; encode HTML sentinels at the DOM boundary

Source: user review on Stripe Express ready-metric PR #937051, 2026-07-30.

I threaded the React 18-compatible empty-string form of `inert` through multiple
component-layer props. That leaked a DOM serialization workaround into otherwise
semantic TypeScript APIs.

Rules for myself:

- Model component props such as `hidden`, `inert`, and `disabled` as booleans.
- Convert a boolean to the required DOM representation (`{inert: ''}`) only on
  the concrete HTML element that receives the attribute.
- Do not make intermediate components and tests understand browser/React
  serialization sentinels.

## State metric timing anchors explicitly when comparing surfaces

Source: user review on Stripe Express ready-metric PR #937051, 2026-07-30.

Admin Billing measures readiness from child mount, while the shared Signup and
MerchantCheckout flow measures from timeout-arm time. Both approximate wallet
probe start, but they are not byte-for-byte identical clocks.

Rules for myself:

- Before claiming cross-surface latency comparability, trace and name each
  surface's exact start and end boundaries.
- Align timing anchors when practical; when lifecycle architecture makes a small
  difference intentional, document it in the metric contract and reporting.
- Do not hide a semantic timing difference behind a shared metric name.

## Distinguish an extraction from a future-consumer component scaffold

Source: user clarification while planning issues-monetization #6926, 2026-07-29.

A shared component can copy an existing surface while deliberately leaving that
surface unchanged because the intended consumer lands later. Do not infer that a
future cancelled-reactivation design already exists, or silently treat the work
as a current-flow migration.

- State whether the existing flow adopts the component now; without adoption,
  call the change a component scaffold rather than a runtime extraction.
- Separate the component-only PR from the later consumer PR when the issue order
  explicitly makes the component a prerequisite.
- If the issue allows either immediate adoption or a tracked follow-up, explain
  the behavioral and API costs of both before asking the user to choose.

## Do not preserve empty prototype taxonomy directories

Source: user correction on ReactivationScene PR #962857, 2026-07-29.

I copied the prototype path `components/reactivation-checkout/ReactivationScene/`
to anticipate several future shared checkout primitives. In the actual PR, that
middle directory contained only one component folder and owned no module boundary,
so it added taxonomy without structure.

- Match the current section pattern: a single shared component belongs directly
  under `components/<ComponentName>/`.
- Add a grouping directory only when it has multiple real siblings or owns a
  meaningful boundary such as exports, configuration, or shared contracts.
- Treat prototype paths as evidence, not conventions; re-evaluate them against
  the production diff and existing neighboring layout before planning.

## Keep personal specs out of tracked repository ignore rules

Source: user correction on ReactivationScene PR #962857, 2026-07-30.

I added `/specs/` to admin-web's tracked `.gitignore` to protect a local planning
capsule. That made a personal agent artifact part of the production diff.

- Before adding a tracked ignore rule for local planning artifacts, inspect the
  user's existing global excludes and keep personal workspace policy outside the
  repository.
- World policy forbids agents from modifying global or repository git
  configuration; if the global excludes rule is missing, ask the user to add it
  rather than changing their git configuration.
- Prefer `~/plans` for durable local planning when no existing global exclusion
  already protects an in-checkout specs directory.

## Verify local-assets transport and backend access before asking for login

Source: user correction while tophatting ReactivationScene PR #962857, 2026-07-30.

I opened `local.preview.admin.shopify.com` and treated Shopify Identity login as
the only blocker. After login, the page still could not load: Chrome could not
fetch the local Vite modules, and once those were proxied, local-preview GraphQL
requests returned 403. The same profile also lacked access to the production
store.

- Distinguish `dev assets`/local-preview from the supported `pnpm prod vite`
  local-assets-against-production setup; do not assume they use the same backend.
- Before asking the user to authenticate, verify the Vite module URLs load in
  Chrome, the target account can open the production store, and one core Admin
  GraphQL request succeeds.
- If an existing asset server owns the required port, do not replace it silently;
  report the conflict and ask the user whether to stop it or use another setup.

## Scope manual tophats to risks not already proven by tests

Source: user challenge on ReactivationScene PR #962857, 2026-07-30.

I proposed manually checking Mobile Bridge, incentive bundles, and the child dialog
because each is a TRN variant. That repeated existing integration coverage rather
than focusing manual effort on what this extraction could uniquely break.

- For behavior-preserving extractions, require manual checks only for changed
  contracts that jsdom cannot prove, especially responsive/native CSS.
- Treat variants already covered by representative integration tests as optional
  smoke checks unless their runtime boundary changed.
- Explain why each tophat case is necessary; remove it if the rationale is only
  “the route supports this state.”

## Talk normally; do not expect expertise in every field

Source: repeated user corrections on the #6154 shimmer-data report, 2026-07-31.

I used phrases such as “occurrence-level event stream,” “episode grain,”
“terminal,” and “downstream enrichment” as if the labels explained the design.
They did not. The user had to stop and ask what each recommendation meant,
slowing the discussion and obscuring which behavior was observed versus inferred.

The user is a senior engineer, not an expert in every specialty involved in a
cross-functional problem. Do not expect one person to already know the local
language of analytics, data modeling, observability, experimentation, payments,
accessibility, infrastructure, and frontend architecture. Technical ability is
not permission to skip the explanation.

- Talk normally. Use common words and direct sentences before introducing a
  field-specific term.
- Lead with the plain idea, then put the technical term in parentheses only when
  it adds value: “a timestamped list of recorded actions (an event stream).”
- Never explain one unfamiliar term with another unfamiliar term.
- Use the outside-specialty test: a strong engineer who does not work in this
  exact field should understand the paragraph without stopping for a glossary.
- For every proposed data table, state what one row represents and whether the
  row is emitted by the application or assembled later in the warehouse.
- For every instrumentation recommendation, answer what is recorded, when it is
  recorded, which identifier connects it, and who performs any later join.
- Do not call missing follow-up data “abandonment.” State the observable fact:
  the wait started and no later signal was recorded. Treat exit events as
  best-effort unless delivery is guaranteed.
- Distinguish a legitimate repeated user experience from duplicate delivery;
  explain idempotency separately rather than hiding both behind “occurrence.”
- Prefer the communication guidelines’ plain reader language even when the user
  is technically sophisticated; technical precision requires definitions, not
  jargon density.

**Update 2026-08-05:** I repeated this failure while explaining the #6154
emission sequence. I drew a pipeline using “surface-owned producer,” “event
envelope,” “FEC,” “refined topic,” and “Factoids BigQuery view” before defining
any of them. A diagram does not become clear merely because it is short.

- Start with actors and verbs: “the checkout records the wait,” “the Admin or
  Signup sender adds context,” “Shopify receives it,” and “the data pipeline
  puts it in a queryable table.”
- Introduce the internal name only after the idea: “Shopify’s browser-event
  receiving service (Frontend Event Collector, or FEC).” Never use the acronym
  alone on first mention.
- For each box in a pipeline, explain what goes in, what that box adds or checks,
  and what comes out. Do not make the reader reverse-engineer arrows.
- Prefer a concrete example row before platform topology. Add implementation
  names afterward for readers who need to find the code.
- Before sending, expand every acronym and replace every unexplained ownership,
  messaging, ingestion, or warehouse term with common words.

## Define tophat override mechanics before presenting expected metrics

Source: user correction on Stripe Express ready-metric PR #937051, 2026-07-30.

I used “show,” “timeout,” and “hide” as table cases without defining how the dev-only monkeypatch changes probe mounting, readiness callbacks, and timeout expectations. That made `hide` look like Stripe reporting an unavailable wallet, contradicting the documented contract that an unavailable provider still records `onReady` duration.

- Define each override in lifecycle terms: whether the provider mounts, remains expected by the timeout, and can deliver `onReady`.
- Distinguish “probe omitted” from “probe mounted and Stripe reports unavailable”; they have different metrics despite both producing no visible wallet.
- Include the real unavailable-provider case in the matrix when it is central to the metric contract, even if the monkeypatch cannot force the provider response.
- Explain why omitted probes produce neither success nor timeout metrics so a correct tophat result is not mistaken for a regression.

## Auth-gated content: ask for the artifact, never drive a sign-in

Sources: internal Google doc while evaluating #6979 (2026-08-04); Figma dev-mode values for #7058 (2026-08-10); GitHub `user-attachments` image on PR #984362 review (2026-08-10). Three corrections in one week; promoted to a global commandment — this section retains the mechanics.

- Isolated agent-browser Chrome profiles hit Google sign-in / Okta / passkey walls David cannot complete through the driven profile. Stop after the first failure and state the exact access needed; never retry.
- If a browser is genuinely required, ask which existing authenticated profile to use (David's default Chrome `Work` profile for Shopify internal docs). But AppleScript `front window` may belong to the agent-browser window and open the URL in the wrong profile again; if the Work profile can't be targeted unambiguously without restarting or attaching debugging, ask for a paste/export instead.
- Ask for everything needed in one message (e.g. Figma: box padding/gap, then per-element type); splitting the ask across rounds cost an extra turn. Offer the browser route only if the values are unavailable.
- When David hands over an image path for auth-gated content (GitHub attachments, Vault, Google Docs), that file (or a re-share) is the only channel; if the path doesn't exist on disk, ask him to re-save/drag it in — never spin up a Chrome/login flow to fetch it.

## Separate linked-issue context from user-requested scope

Source: user correction while planning issues-monetization #6928, 2026-08-04.

I prominently included #6806 in the plan even though the user asked only about
#6928. The link was evidence-based—#6928 names #6806 as both a dependent and an
acceptance-criteria consumer—but I failed to distinguish issue-derived context
from scope the user had requested.

- State why an adjacent issue matters before adding it to a plan.
- Label linked work as dependency context, future consumption, or out of scope;
  never present it as user-authored scope.
- Keep implementation and PR drafts limited to the requested issue unless the
  user explicitly approves a cross-issue change.
- If a linked issue creates contradictory acceptance criteria or sequencing,
  surface the contradiction and ask which boundary to use before planning it.
- Apply this rule to issue investigations and PR plans. A linked issue may still
  explain an API choice, but it must not silently expand the diff.

## Name positional slot props by role, not `content`

Source: user correction on shop/world PR #975744 (#6928), 2026-08-04.

I shipped a new optional slot on `CheckoutLayout.mobileHeader` as `content`
even though it renders in one specific position (directly after the mobile
headline/subtitle). David corrected: `content` is not the right name when the
slot's placement is specific.

- A generic `content` name is only right for a component's main body; a slot
  with a fixed position needs a role/position name.
- Prefer names that match sibling conventions in the same API surface — here
  `leftPanel: {content, footer}` already established `footer` as the trailing
  slot, so `mobileHeader.footer` was the consistent choice.
- Check whether the name creates useful symmetry for known future callers
  (cancelled flow pairs desktop `leftPanel.footer` with mobile
  `mobileHeader.footer`).
- Uncertainty: David approved the direction but didn't explicitly ratify
  `footer` over positional names like `belowHeadline`; confirm if it recurs.

**Update 2026-08-05:** `footer` was also rejected — "not the appropriate name
for header content". Final name: `belowSubtitle`, chosen because it names the
slot's DOM anchor (the required sibling `subtitle` prop it renders directly
after). Refined principle: for a positional slot, prefer the name of its
concrete DOM anchor over borrowed layout metaphors (`footer`) or generic
roles (`content`); sibling-prop convention symmetry does not outweigh a
metaphor that contradicts the parent's own name (a footer inside a header).

## Separate Event Refinery schema approval from client feasibility

Source: user correction while planning payment-wait reporting for #6154,
2026-08-05.

I initially bundled schema/governance approval and the client producer path into
one Gate 0 epic. That skipped a distinct feasibility question: an approved Event
Refinery payload does not prove Admin Web—and especially the isolated Signup
application—can hydrate and send the required envelope.

- Plan schema and governance first: event family, payload shape, accepted user
  context, consent, warehouse materialization, and downstream compliance.
- Add a separate follow-up epic to prove the client path, including Admin's
  existing `makeEnvelope`, Signup's missing feature-proto emitter, staging/FEC
  delivery, and the fallback if Signup cannot emit compliantly.
- Only plan production lifecycle instrumentation after both decisions are made;
  keep warehouse modeling separate because it has different owners and launch
  controls.
- Scope: new Event Refinery integrations from admin-web or another isolated
  client application, not routine use of an already-proven proto method.
- Evidence: Admin has `packages/admin/context/observability/index.ts`; Signup has
  DUX setup but no equivalent feature-proto producer today.
- Uncertainty: whether Signup can reuse Dux or `@shopify/proto-ts` safely remains
  unresolved and belongs in the client-feasibility epic, not the schema epic.

**Update 2026-08-05:** I described Signup as having no Event Refinery path,
which ignored its existing Dux deployment. Signup's `DuxWrapper` already sets
`protoEventSource="EVENT_APP_ADMIN_WEB"`; Dux 7.6 exposes a typed
`trackers.duxProto(...)` transport when `enableLogger.duxProto` is enabled.
Future feasibility work must investigate Dux first and distinguish three paths:
automatic Dux events forwarded to ER, legacy custom `trackers.dux(...)` events
that still use Monorail, and typed custom `trackers.duxProto(...)` events routed
to the proto envelope. Do not propose a second client or claim no ER transport
until Dux's payload, identity, consent, source, and Signup wrapper constraints
have been tested. Uncertainty remains around the correct source app, Signup user
classification, shop context (the current custom proto middleware path sends
`shopContext: null`), and whether the endpoint has all trusted identifiers.

**Update 2026-08-05 (producer correction):** Investigating Dux first does not
mean using it first on every surface. I overgeneralized Signup's plausible
transport into an Admin-first architecture. For a durable Admin business fact,
first write “one row means \_\_\_ happened,” then use the established semantic
emitter in `packages/admin/context/observability/index.ts`: feature code passes
only the generated payload, while the slice owns the envelope and FEC transport.
Keep Dux for bounded UI telemetry and as a separately approved Signup
`duxProto` candidate. Never repurpose `DuxEvent`, Admin search/navigation/runtime
events, or a feature-owned `SimpleProtoClient`. Public advisory feedback is not
owner approval; Event Refinery conventions may require an actual schema PR and
first-consumer review before the governance gate closes. Scope: new durable
Admin semantic events spanning Admin and isolated Signup. Evidence: supplied
Admin architecture review plus the #6154 public thread. Uncertainty: the final
Signup producer, employee semantics, consent defaults, raw-table ownership, and
first-consumer projection still require owners.

**Update 2026-08-05 (coordination correction):** I then treated every downstream
step as a separate architecture approval and inflated the #6154 owner matrix.
Dux already gives Admin, Signup, and Guest Checkout an Event Refinery transport:
both wrappers set `protoEventSource`, and Dux 7.6 routes typed `duxProto` payloads
through the existing `/.well-known/dux` middleware and FEC envelope path.

- Separate **contract decisions** from **standard execution**. A new durable
  proto needs one schema/domain reviewer and one real first consumer; Infra
  Central topic creation and Factoids ingestion are self-service/onboarding
  workflows, not additional product-design owners.
- Do not gate on a Dux owner when using the supported `duxProto` API, a Signup
  observability owner when Dux already suffices, a separate privacy owner when
  existing envelope consent plus schema classifications settle the contract, or
  a modeled-data owner before a modeled table is actually required. Escalate
  each only when the existing path proves insufficient.
- A new payload type still creates type-specific refined/validated topics even
  though transport is reused. Reusing the pipe does not mean reusing the
  `DuxEvent` topic. Extending `DuxEvent` could avoid new topics, but its own
  schema guidance rejects using the generic substrate as a loophole for a
  stable, high-value business fact.
- Admin custom proto emission should keep using Admin observability because the
  current Dux client-proto middleware deliberately leaves shop and organization
  null. Signup may use Dux because pre-shop nulls are legitimate, provided its
  MTT/session/identity contract satisfies the first consumer.
- Evidence: Admin and Signup `DuxWrapper.tsx`, Dux 7.6 `Track.duxProto`, Dux
  middleware `ir(...)`, `EVENT_SCHEMA_CONVENTIONS.md`, and issue-on-ramps #865.
- Uncertainty: whether Signup's Dux MTT/session is enough to join Guest Checkout
  waits to the later merchant remains a consumer question; only that gap should
  trigger Signup/Dux envelope work.

## Keep Slack review requests focused on the decisions

Source: user correction on the #6154 Event Refinery review packet, 2026-08-05.

I prepared an oversized root message that repeated the ADR's alternatives, API
details, and evidence. David asked for a shorter, easier-to-read request focused
only on the information needed from reviewers.

- Lead with the use case and recommended contract in a few bullets.
- Ask one scannable question per blocking decision area.
- Keep the detailed proto, alternatives, and evidence in the durable ADR; add
  them as thread replies when a reviewer needs them.
- Scope: Slack design and governance review requests backed by a longer artifact.
- Evidence: the #6154 packet was reduced to 236 words and seven numbered asks.
- Uncertainty: some schema reviews may require the full proto immediately; link
  or attach it without expanding the root request into a second design document.

## Design-spec CSS work: token traps and how to prove the result

Source: issue #7058 (cancelled-reactivation summary block), PR shop/world#984362, 2026-08-07.

Getting a Figma spec into admin-web CSS hit four traps that will recur:

- **stylelint bans _every_ unit on `line-height`** (`px`, `rem`, `em`, `%`, …), so an
  off-scale value like 18px cannot be written literally. The merchant-checkout family's
  idiom is `calc(var(--p-font-line-height-400) + var(--p-space-050))` — see
  `Checkout/AdminCheckout/LeftPanelFooter`, `StatusBadge`, `QuoteSummary`. Look for a
  sibling doing the same arithmetic before inventing a value.
- **`--p-font-weight-regular` is 450 under `.p-theme-light`, not 400.** Figma text styles
  say "Inter 400" because Figma lacks the variable-font 450. Literal numeric weights are
  lint-banned anyway, so when a spec says "Body/**Default**", _delete_ the weight
  declaration and inherit rather than chase the number.
- **`letter-spacing` in `em` inherits as a computed length, not a ratio.** Declaring the
  tracking once on a container gives every child the _parent's_ px value. If a design uses
  one ratio across sizes (here `-0.032em` → -0.576/-0.448/-0.384px), it must be
  re-declared on each element that changes font-size.
- **A flat CSS harness collapses CSS-module scoping.** `LeftPanel.module.css` and the
  section CSS both define `.Footer`; loading both raw into one page silently added 24px of
  padding. Rename in the harness copy, or the measurement lies.

**Prove CSS, don't eyeball it.** A ~60-line puppeteer-core script that loads the real token
file plus the real module CSS, then asserts `getComputedStyle` against the spec, converted
"looks about right" into a table of exact matches (sizes, tracking, colour, gaps, insets) —
and is what caught the `.Footer` collision. Connect to the existing agent-browser Chrome on
CDP 9222 and run the script from a cwd that has `puppeteer-core` installed.

**Testing Library `getByText` joins only _direct_ text-node children.** Wrapping part of a
string in a span (`$51.00 <span>USD</span>`) breaks `getByText('$51.00 USD')` even though
`textContent` is unchanged. Use `getByText('$51.00')` + `toHaveTextContent('$51.00 USD')`.
Also re-check _negative_ assertions after such a split: `queryByText('$51.00 USD')` starts
passing vacuously and stops guarding anything.

**Splitting a formatted currency string: re-derive, never parse.** `formatCurrency`'s
`explicit` form is `` `${short} ${code}` `` unless `short` already contains the code (CHF).
Rebuild from `short` + code using that same rule instead of regexing the rendered output.

## Figma spec values: confirm what a number describes before applying it

Source: issue #7058, PR shop/world#984362, 2026-08-10 (two corrections, same failure family: copied a Figma number without confirming what it applies to).

- A frame's `gap` separates that frame's _direct children_ — groups, not leaf rows. I applied a 32px group gap as per-line spacing on a dense summary list whose real per-line value was 8px. The ignored signal: a 2.7× jump from the existing 12px. Magnitude is itself evidence — when a spec value would multiply existing spacing, confirm what it separates before applying, and say plainly that it will look much airier so the reviewer can catch it early.
- Figma variables resolve per mode: `spacing/medium` / `spacing/large` were 16/32 in the desktop frame but 12/16 in mobile. Carrying desktop numbers into a mobile question produced a target (48px) _larger_ than the value being complained about (44px) — arithmetic contradicting the complaint is the tell that a value came from the wrong frame. Re-inspect at every breakpoint; when a spec number can't explain the reported symptom, stop and re-derive rather than rationalise.
- A frame whose `gap` doesn't match the rendered leaf spacing is the _wrong frame_ — treat every other value copied from it as suspect, not just the gap.
- Measuring the design screenshot is a real check, not busywork: decoding the PNG, classifying the hatched spacing bands, and calibrating against a numeric badge visible in the same image ("20") put the true total at ~26–30px and ruled out 48px before any CSS was written.
- Corollary that worked: because the harness reported `gapRow1to2` as a number, the fix was verifiable in one run. Keep measuring geometry, not just type.

## Verify the tophat build actually serves your code before debugging its behaviour

Source: TRN mNative "black screen", 2026-08-10 (PRs #987320 / #987620).

A `/webmanifest` mNative tophat black-screened. I spent several rounds theorising
about WebKit compositing (`position: fixed` scroller, fixed `BackgroundScene`
painting over content), then built an on-screen diagnostics overlay — all for a
page that was never served. Simulator `log stream` showed the truth immediately:

```
isMainResource=1 ... didReceiveResponse: (httpStatusCode=400, MIMEType=text/html)
```

Root cause: the webmanifest sends header `Shopify-Web-Manifest: <branch-name>`,
but the **web assets/manifest must be uploaded by a separate manual Buildkite
gate** ("Upload Assets and Manifests?" in `world-web-ci-builder`). I never ran CI
on the branch, so no manifest existed for that ID → server 400 → blank webview.
`devx ci status -b <branch>` said `Commit not found`, which was the tell.

Rules for myself:

- **Before diagnosing rendered behaviour on a tophat build, prove the build
  serves your commit.** For webmanifest: CI has run on the branch AND the
  "Upload Assets and Manifests?" step completed AND the PR comment shows a
  manifest value. `devx ci status -b <branch>` returning `Commit not found`
  means nothing was built.
- **Check the transport before the CSS.** One `xcrun simctl spawn booted log
stream --predicate 'processImagePath CONTAINS[c] "Shopify" OR ... "WebContent"'`
  capture beats any amount of static CSS reasoning. Grep `isMainResource=1` for
  the document status first.
- **Verify the environment is alive first.** The same session had a wedged
  simulator: `simctl io screenshot` → "Timeout waiting for screen surfaces",
  `shutdown` → "current state: Shutdown" (it had died), Safari → "couldn't
  connect to the server". A plain `simctl shutdown && boot` (never `erase`) fixed
  all of it. A dead simulator renders black and mimics a real bug.
- **`/webmanifest` requires the `//areas/clients/admin-mobile` label** on the PR.
  Without it the mobile snapshot may build while the web manifest never does.
- I can drive the simulator directly from the shell — `simctl list devices
booted`, `io screenshot`, `openurl`, `launch`, `log stream`. Use it to observe
  instead of relaying commands. Loading the URL in the simulator's own Safari is
  the cheapest web-vs-native isolation test.

## local.preview serves production assets unless the session is @shopify.com

Source: PR #984362 tophat, 2026-08-10. Changes "didn't appear" despite a correct Vite server
(curl showed fresh CSS), hard refreshes, and a served-code audit. Root cause was server-side:
`shouldUseCustomCdn` on `local.preview.admin.shopify.com` returns
`isShopifyEmailAddressSession(ctx)` — logged in as only a test-merchant (Genghis) account, the
page silently gets PRODUCTION assets, and remote/PR-preview manifests are ignored on that host
too. Debug order for "stale code" reports: (1) `[...document.scripts].map(s=>s.src)` —
cdn.shopify.com means wrong session, vite.local.shop.dev means real staleness; (2) only then
chase HMR/caching. Fix: sign in to accounts.shopify.com with the @shopify.com identity
alongside the merchant account. Also learned: a DOM probe (computed margin/padding walk from a
found text node) settles "which build is this tab running" faster than screenshot forensics —
ask for it early; and watch for DevTools console filters hiding output ("returns undefined").
