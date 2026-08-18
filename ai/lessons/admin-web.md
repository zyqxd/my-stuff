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

- Never analyze paired-metric emission (ReadyResult vs ReadyDuration) by
  reading each file in isolation: the INNER `StripeExpressAdminCheckout.handleReady`
  emits Duration, then calls `onReady`, which makes the OUTER `ExpressPayButtons`
  emit Result(success) — both fire once, paired across parent+child. Trace
  `onReady`/callback nesting before asserting "this surface emits X but not Y".
- Product fact: there is NO standalone "add Apple Pay / Google Pay as a payment
  method" flow; Stripe Express wallets render only when the merchant/device has
  that wallet set up (availability-gated). `StripeExpressAdminCheckout` is only
  the inner button under `ExpressPayButtons` on the billing checkout page.
- Real ReadyResult/ReadyDuration discrepancies are narrow (Result carries
  `surface`, Duration doesn't; duration skew across paths; rare
  double-ready/late-ready count edges), not a "success emits only one metric" gap.

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

Source: user correction on PR #937049, 2026-07-27. I kept both `surface` and
`source` on `StripeExpressPayElementReadyResult` (same Admin-versus-Signup
value) as a compatibility hedge — two names that could conflict and no single
reporting contract. Make one canonical and audit consumers before removing the
other.

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

Source: user correction on PR #937051, 2026-07-28. I took a reviewer's
"non-blocking; include it in the follow-up" as a reason not to fix a
high-cardinality `duration` label in a PR that already touched every emitter.

- A reviewer allowing a follow-up is permission, not a requirement; prefer the
  active PR when the fix is small, cohesive, and all emitters and types are
  already in scope — especially before emission volume expands.
- Verify alerts, SLOs, and exact dashboard queries first; if no consumer
  filters or groups by the label, do not invent compatibility risk to justify
  deferral.

## Keep review fixes scoped to the reviewed emission condition

Source: user correction on PR #937051, 2026-07-28. A comment on removing
synthetic timeout ReadyDuration samples drew a redesign of post-timeout
duration capture — outside the requested comment.

- Limit the fix and discussion to the commented condition unless the user asks
  for a redesign; do not turn an adjacent observability idea into scope.
- State shared-path coverage explicitly: `useExpressPayConfig` serves Signup
  and MerchantCheckout; `ExpressPayButtons` is the separate Admin Billing path.

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

## Talk normally — mechanics (principle is constitutional)

Sources: repeated corrections on the #6154 shimmer-data report, 2026-07-31, and
the #6154 emission-sequence diagram, 2026-08-05 (a short diagram is not
automatically clear). The "User-facing prose" commandment carries the
principle; these mechanics stay scoped.

- Lead with the plain idea; add the technical term in parentheses only when it
  adds value: "a timestamped list of recorded actions (an event stream)".
  Introduce internal names after the idea and expand every acronym on first
  mention: "Shopify's browser-event receiving service (Frontend Event
  Collector, or FEC)". Never explain one unfamiliar term with another.
- Outside-specialty test: a strong engineer outside this exact field should
  read the paragraph without stopping for a glossary. Start pipelines with
  actors and verbs; for each box state what goes in, what it adds or checks,
  and what comes out. Give a concrete example row before platform topology.
- For every proposed data table, state what one row represents and whether the
  application emits it or the warehouse assembles it later. For every
  instrumentation recommendation: what is recorded, when, which identifier
  connects it, and who performs any later join.
- Do not call missing follow-up data "abandonment" — state the observable fact
  (the wait started; no later signal was recorded) and treat exit events as
  best-effort. Distinguish a repeated user experience from duplicate delivery;
  explain idempotency separately rather than hiding both behind one term.

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

## Event Refinery from admin-web/Signup: contract decisions vs standard execution

Source: #6154 payment-wait reporting, 2026-08-05 — four corrections in one day,
consolidated 2026-08-17 (superseded intermediate reasoning removed; final rules,
evidence, and uncertainties kept).

- Plan schema/governance and client feasibility as separate epics: an approved
  payload does not prove Admin — and especially the isolated Signup app — can
  hydrate and send the required envelope. Plan production lifecycle
  instrumentation only after both decisions; keep warehouse modeling separate
  (different owners and launch controls).
- For a durable Admin business fact, first write "one row means ___ happened,"
  then use the established semantic emitter in
  `packages/admin/context/observability/index.ts` — feature code passes only
  the generated payload; the slice owns envelope and FEC transport. Admin keeps
  using Admin observability because the Dux client-proto middleware
  deliberately leaves shop and organization null.
- Keep Dux for bounded UI telemetry and as the separately approved Signup
  `duxProto` candidate: both wrappers already set `protoEventSource`, and Dux
  7.6 routes typed `duxProto` payloads through the existing `/.well-known/dux`
  middleware and FEC envelope path. Distinguish three paths before proposing
  any new client: automatic Dux events, legacy `trackers.dux(...)` (Monorail),
  and typed `trackers.duxProto(...)`. Never repurpose `DuxEvent`, Admin
  search/navigation/runtime events, or a feature-owned `SimpleProtoClient`.
- Separate contract decisions from standard execution: a new durable proto
  needs one schema/domain reviewer and one real first consumer; Infra Central
  topic creation and Factoids ingestion are self-service onboarding, not extra
  owners. Do not gate on a Dux owner (supported API), a Signup observability
  owner (Dux suffices), a separate privacy owner (envelope consent plus schema
  classifications settle it), or a modeled-data owner before a modeled table is
  required — escalate only when the existing path proves insufficient.
- A new payload type still creates its own refined/validated topics even though
  transport is reused; extending `DuxEvent` as a loophole for a stable business
  fact is rejected by its own schema guidance. Public advisory feedback is not
  owner approval — expect an actual schema PR and first-consumer review before
  the governance gate closes.
- Scope: new Event Refinery integrations from admin-web or another isolated
  client application, not routine use of a proven proto method.
- Evidence: Admin/Signup `DuxWrapper.tsx`, Dux 7.6 `Track.duxProto`, Dux
  middleware `ir(...)`, `EVENT_SCHEMA_CONVENTIONS.md`, issue-on-ramps #865, and
  the #6154 public thread.
- Uncertainty: the final Signup producer, employee semantics, consent defaults,
  raw-table ownership, first-consumer projection, and whether Signup's Dux
  MTT/session suffices to join Guest Checkout waits to the later merchant —
  only that last gap should trigger Signup/Dux envelope work.

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

## Use the approved analytics name while documenting browser limits

Source: PR #984365 tophat, 2026-08-11. I named the wait-deactivation event
`stripe_express_shimmer_page_hidden` to avoid implying abandonment. David chose
`stripe_express_shimmer_bounce` after comparing it with the existing page-level
bounce signal and asked for the complete browser-cause contract.

- Follow the approved product/analytics name, but define the directly observed
  fact separately: an open wait received `visibilitychange`→hidden or
  `pagehide`; it does not prove permanent abandonment.
- List which actions usually produce those signals—tab switch, minimize,
  navigation, reload, tab/browser close—and state that JavaScript cannot
  reliably distinguish them or survive crash/force-kill/device shutdown.
- Test both trigger paths, visible-state rejection, deduplication, cleanup, and
  no emission after resolution; do not treat a name change as string-only.
- Keep forced-wait tophat helpers uncommitted and verify the remote PR excludes
  them. This is especially important in this workstream because dev-only Stripe
  overrides previously escaped onto real branches.
- Scope: browser lifecycle analytics and local Stripe readiness experiments in
  admin-web. Evidence is the dual-event local tophat and PR #984365 update.
  Uncertainty: downstream reporting may later retire the legacy page-level
  bounce or add a richer, typed exit contract.

## Inventory terminal events before proposing a companion outcome

Source: PR #984365 event-model review, 2026-08-12; consolidated 2026-08-17
(working-design conduct now lives in commandment #7). I proposed a new
`checkout_completed` diagnostics event before confirming the existing
plan-change funnel.

- Check tracker factories and success callbacks before adding outcome events:
  Signup and Admin already emit
  `merchant_onboarding_settings_account_start_plan_pressed_success/3.6`, reused
  by Guest Checkout and Trial Reactivation. Prefer that authoritative
  attempt/success/error family over a duplicate diagnostics row.
- Inventory existing correlation keys before adding one. `sessionId` spans many
  events but is not a checkout-attempt ID (re-entry, reload, and concurrent
  tabs produce multiple view lifecycles per session); distinguish counting rows
  from attributing surrounding events to one view — a view ID resolves the
  latter. Add a companion event only when deterministic correlation is
  demonstrably required and the identity-and-time join cannot achieve it; make
  duplicate-counting and semantic-drift costs explicit first. A checkout-submit
  diagnostic earns its place when it carries the view ID needed to join the
  authoritative success event — verify it fires at actual submission on every
  payment path, not a button-click proxy.
- Encode downstream join requirements as a surface-discriminated
  event-name-to-fields map, not `{[key: string]: unknown}`. Verify IDs at the
  adapter boundary: Signup and Guest Checkout emit numeric `userId: 0`, so
  `storeSignupUuid` is the required key there; `identityUuid` is a distinct,
  optional Identity-account key and must not be relabeled `userId`. Separate
  directly emitted events from warehouse classifications (a non-Apple/Google
  route can be derived from `paymentType`; it proves no extra view).
- Distinguish temporary deactivation from terminal exit: visibility
  hidden→visible retains one view ID; modal/route exit or `pagehide` closes it
  and any re-entry mints a new one; plain `window.blur` is neither. Treat
  missing-signal classifications as terminal — describe the missing resolution
  instead of appending impossible follow-on states.
- Investigate hard-coded identity fallbacks (e.g. required `sessionId: "0"`)
  before replacing them; history without rationale proves origin, not intent.
  When a reviewed design supersedes a draft PR, the document is the source of
  truth and current code is prior art only.
- Scope: merchant checkout outcome instrumentation in admin-web. Evidence:
  `getPlanChangeTrackingEvents` and both `getCheckoutTracker` factories.
  Uncertainty: production validation may show view-level deterministic
  correlation needs a future schema version; not proven now.

## Create the branch before the first commit of a story

In a Graphite stack it is easy to finish one story, keep working, and commit the
next story onto the previous story's branch. Nothing warns you: tests pass,
`fastcheck` passes, and `gt submit` cheerfully pushes the extra commits into the
open PR of the story below.

Cost when it happened: eight commits of e05s05 landed on the e05s04 branch and
were pushed to that PR, which had already been reviewed.

Recovery is safe if the commits are contiguous: branch at the current tip, hard
reset the lower branch to its real boundary commit, then
`git push --force-with-lease`. `--force-with-lease` will reject with "stale
info" right after a push; `git fetch <branch>` first, or pin the expectation
with `--force-with-lease=<branch>:<sha>`.

Future action: run `git branch --show-current` immediately before the first
commit of a new story, not after.

## write.quick: the editor owns the text once a doc is opened

`content` and `crdtBaseContent` on a `documents` row are only a **seed**. The
first time someone opens the document, LiveDoc creates a Yjs CRDT row in the
`__livedoc` collection keyed by `name = <document id>`, and from then on the
editor renders that CRDT state. Database writes to `content` still succeed, and
still verify as correct when read back, but are invisible in the browser.

Symptom: "I refreshed and nothing changed" while every read-back check passes.

Fix: back up the `__livedoc` row, `DELETE /api/db/__livedoc/<row id>`, and let
the editor re-seed from `crdtBaseContent`. Ask the reader to close the tab
first — an open tab holds the Yjs doc in memory and can re-persist the old
state.

Future action: after publishing to a doc that has ever been opened, check
`__livedoc` for a row before claiming the update is live. Verifying the database
is not the same as verifying what the reader sees.

## Do not rename a production event without a very good reason

A rename splits the reporting flow downstream. Every dashboard, saved query,
scorecard, and warehouse model keyed to the old name stops at the rename date,
and anyone comparing across it has to know to UNION two names. The cost is paid
by people who were not in the conversation, indefinitely.

This came up on `checkout_express_pay_state_at_submit`. After moving it to the
shared submission fetcher it fires on every payment path, so the name
under-describes it, and I proposed renaming to `checkout_submitted` on the
argument that the deploy already breaks the population so we may as well pay one
discontinuity instead of two.

That argument is wrong. A population change and a name change are not the same
cost. A population change is a step in a series that still exists and can be
explained; a rename ends the series. "We are already breaking it" is not a
licence to break it in a second, worse way.

Future action: treat an event rename as requiring a specific downstream
justification, not merely a better name.

**The follow-on is sharper than the original lesson.** If a rename is too
expensive, *moving* the same event to a new call site is not the safe
alternative — it is worse. A rename fails loudly: queries return zero rows and
someone notices. A moved call site keeps returning rows that quietly mean
something else. When the question changes, **add a new event and leave the old
one alone**; that is what was already done for `checkout_bounce_with_shimmer`.

## Planning capsules must not live inside a repo checkout

**Failure (2026-08-17).** The e05 bigpowers capsule (`specs/epics/e05-*`,
`specs/verifications/*`, `epic.yaml`, `execution-status.yaml`) lived at
`areas/clients/admin-web/specs/` inside the World checkout and was gitignored.
It is now gone — nothing tracked it, so no clean/reset/worktree operation had
any reason to preserve it. Roughly two weeks of story specs, task YAMLs, the
five-surface remount audit, and the mutation-testing evidence went with it.

**Why it happened.** Gitignored + inside a checkout is the worst combination:
git will not restore it because it is untracked, and tooling feels free to
delete it because it is ignored. This is the same hazard already recorded for
`tasks/` folders, but I did not generalize the rule to `specs/`.

**Future action.** Durable planning artifacts go in `~/plans/<project>/`, which
is version-controlled in the brain bank. If a tool insists on a
checkout-relative path (bigpowers writes to `specs/`), symlink it out to
`~/plans/<project>/specs/` at setup, before writing anything into it.

**What survived, and why that is the real lesson.** Everything that mattered
had been pushed to a durable home as it was produced: the spec on write.quick,
the contract comments on the docs PR, the ACs on the GitHub issues, and the
evidence tables in the PR bodies. The capsule was the scaffolding, not the
product. Keep writing conclusions outward as they are reached rather than
leaving them only in working state.

**Scope.** Any bigpowers/agent capsule in any World zone.

## A "surface"/context enum belongs to the journey, not the call site

**Failure (2026-08-17, #995644).** I added a required `surface` argument to
every checkout tracker factory and considered the job done. Two factories each
serve two different merchant journeys, so two surfaces are wrong:
`getReactivationCheckoutTracker` hardcodes `admin_trial_reactivation` inside
the wrapper while also serving `/reopen` (cancelled reactivation). My own spec
said "required at every tracker call site; there is no default" — a constant
inside a shared wrapper is a default.

**Future action.** When adding a classifier argument, enumerate the *call
sites* of each factory, not the factories. For each one ask which route or
journey it runs on, and confirm with the route manifest. If a factory has more
than one journey, the argument must be a parameter, never a constant inside it.

**Second failure in the same review: I nearly implemented a reviewer's fix
without verifying their mechanism.** The reviewer said a component "also
serves" a second route. It does not — the manifest resolves that path to a
different, legacy component, and production shows 6 rows/day there. They were
misled by an unreachable pathname predicate left in the component. Verify the
mechanism, not just the conclusion; otherwise you add dead code and leave the
real bug in place.

**Verification that worked.** Route manifests answer "what renders here";
production `payload.pathname` answers "what actually happens". Use both — the
manifest alone would not have shown the reactivate route is near-dead, and the
data alone would not have shown which component owns it.

**Scope.** Any enum/classifier threaded through factories in admin-web.

## Never reuse a reviewer's comment numbers for your own action items

**Failure (2026-08-17, #995644).** I numbered a disposition table 1–4 after the
reviewer's four comments, then referred to my own separate finding as "Fix 2".
Comment 2 was the one I had *rejected*. David had to stop and ask "I thought
you said 2 was a reject?" — the plan read as though I had reversed myself.

**Future action.** When responding to review feedback, keep two namespaces:
numbers for *their* comments, letters for *my* actions. State the mapping
explicitly, including comments that produce no action and actions that come
from no comment. A rejected comment and an accepted action must never be able
to share a label.

**Scope.** Any review-response writeup, PR reply, or plan derived from
numbered external feedback.

## Stage your work before mutation-testing

**Failure (2026-08-17, #995644).** I mutation-tested with `git checkout -- <file>`
as the revert step while my implementation was still unstaged. The first revert
restored the file to HEAD, silently deleting the real edits to two files. The
next two mutations then failed to find their anchors and reported against the
reverted code, which briefly looked like missing test coverage rather than a
lost implementation.

**Future action.** `git add -A` before the first mutation. `git checkout --`
restores from the index, so with the work staged the revert puts back the
implementation instead of HEAD. Assert the anchor count before writing, and
after the run verify the implementation is still on disk.

**Scope.** Any mutation-testing or scripted edit/revert loop.

## Verify the branch after `gt checkout` — never swallow its output

**Failure (2026-08-18).** I ran `gt checkout <branch> 2>&1 | tail -1` and read
the truncated output as success. It had actually failed with "already used by
worktree at ~/world/trees/root/src" — the root worktree was parked on that
branch. Every edit for the next ~20 tool calls went to the wrong branch (the top
of the stack instead of the bottom). Only an unexpected file existing gave it
away. Nothing was committed, so it was recoverable, but the work had to be
redone on the right branch.

**Future action.** After any branch switch, assert rather than read:
`B=$(git branch --show-current); [ "$B" = "<expected>" ] || exit 1`. Never pipe
`gt checkout` through `tail`/`head`. Keep the root worktree on `main` — a
feature branch parked there silently blocks the dedicated worktree.

**Related.** In a Graphite stack, a change belongs on the branch that
*introduces* the thing being changed. I twice fixed test files one branch too
high, which left the lower branch failing type-check on its own. After a
stack-wide change, grep every branch with `git grep <pattern> <branch>` and
confirm each is independently clean.

**Scope.** Any multi-worktree or stacked-branch work in World.

## Recovering a shop/world PR that Graphite closed by deleting its base

**Failure (2026-08-18).** `gt submit --force` on a stacked branch failed with
"failed to retarget PR #996927: Server Error". Graphite had retargeted the PR to
a temporary `graphite-base/996927` branch and then deleted that ref; GitHub
auto-closes a PR whose base branch is gone. The next `gt submit` refused to run
at all because it saw a closed PR in the stack, blocking two other branches.

**Recovery, in this order — order matters:**

1. Restore the deleted base ref. `git ls-remote` and the GitHub API may both
   report it missing while Gitstream still holds it, so a plain push fails
   "non-fast-forward". Push it with `--force`:
   `git push --force origin <sha>:refs/heads/graphite-base/<pr>`.
2. Restore the head branch to the exact SHA it had when the PR closed. GitHub
   refuses to reopen with "state cannot be changed. The <branch> branch was
   force-pushed or recreated" otherwise, and no amount of retrying helps.
3. Reopen with REST: `gh api -X PATCH repos/shop/world/pulls/<pr> -f state=open`.
   `gh pr reopen` returns an unhelpful "Could not open the pull request".
4. Only now retarget the base to the real parent — GitHub rejects a base change
   while the PR is closed.
5. Force-push the head forward to the current tip.

**Also learned.** `--force-with-lease` reports "stale info" against Gitstream
even immediately after fetching the exact refs. Verify the remote tip's author
and that the divergence is your own rebase, then use plain `--force`.

**Prefer plain git to unblock.** When `gt submit` refuses because of one bad PR
in the stack, pushing the other branches with plain `git push` updates their PR
heads fine and decouples "code pushed" from "PR object repaired".

**Scope.** Graphite stacks in shop/world.

## Distinguish code dependency from feature dependency when reporting isolation (2026-08-17)

**Failure:** On shop/issues-monetization#7256 I described the PR as "self-contained"
after rebasing onto main. David challenged it — correctly. The change was
*code*-isolated (branch = main + 1 commit, no symbols from the open #1001312,
type-check and 1479 tests green) but *feature*-dependent: the issue's acceptance
criterion needs #1001312 to produce the `?plan=&bp=` URL, so on main alone the
change is dormant and reachable only by typing the URL.

**Why it matters:** "self-contained" reads as "ready and complete". It invited the
wrong conclusion about whether the issue could be closed, and made my earlier
"#7256 depends on #1001312" look like a contradiction when both statements were
true about different things.

**Future action:** when reporting that work is isolated/unblocked, always answer two
questions separately and label them:
1. **Code dependency** — does it compile, type-check and pass tests on the base
   alone? Prove with symbol audit + green checks.
2. **Feature dependency** — can a user actually reach the behaviour on the base
   alone? Prove by tracing the entry point (who navigates/produces the input).
State the merge-order consequence of each order when they differ.

**Scope:** any stacked/parallel PR work, not just admin-web. Especially where one PR
supplies a route or URL and another consumes it.

**Evidence:** shop/world#1001494; on main nothing navigates to `/reopen` with
`plan`/`bp` (only a test fixture matches), the plan link still targets the legacy
full-page picker.

## Derive PR-body payload claims from test assertions, not from reading the code

**Failure (2026-08-18).** #995644's body claimed Signup "omits `userId`/`shopId`
rather than sending `0`". The code emits `0` for both, and a test named
`emits Signup zero join keys and relies on storeSignupUuid to join` asserts
exactly that. A reviewer caught it. The tophat checklist I wrote — "confirm a
Signup payload omits userId and shopId entirely" — would have failed on first
attempt, so the body shipped a verification step that could not pass.

**Root cause: inference stood in for tracing.** Two true facts,
(a) the builder omits a key when the host supplies `undefined`, and (b) Signup has
no usable numeric userId, were fused into a false third claim. What was never
checked is the value Signup actually supplies: `getSharedTrackingPayload` sets
`isSignupFlow ? {shopId: 0, userId: 0}`, an explicit zero, so the `undefined`
branch never runs. Reading the mechanism is not the same as tracing the value
through it.

**The verification I ran could not catch it.** Tests compare code to code; the
full suite was green while the prose was wrong. Nothing checks prose against
code, so "PR bodies are verification scripts" had no enforcement behind it.

**Future action.** When a PR body asserts anything about payload shape — a field
present, absent, zero, or renamed — grep the test file for that field and quote
the assertion into the body. If no test asserts it, either add one or drop the
claim. Prefer deriving the body's field table from test names, since a test name
that contradicts the prose is the cheapest possible signal.

**Second-order.** After any contract change, sweep every PR body and issue in the
stack for the removed vocabulary, not just the PR being edited. The same
`customFields.surface` removal left stale claims in three other PR bodies and in
two issues' acceptance criteria; reviewers then judge code against requirements
that no longer exist.

**Scope.** Any stacked PR set with a written contract.
