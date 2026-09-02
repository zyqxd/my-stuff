# Lessons — checkout metrics and event contracts

Stripe Express, metric labels and timing anchors, Event Refinery, and event naming.
Split out of `admin-web.md` on 2026-09-01 — the lesson text is unchanged.
Sibling files: `admin-web.md`, `world-git.md`, `world-verification.md`.

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

## Define tophat override mechanics before presenting expected metrics

Source: user correction on Stripe Express ready-metric PR #937051, 2026-07-30.

I used “show,” “timeout,” and “hide” as table cases without defining how the dev-only monkeypatch changes probe mounting, readiness callbacks, and timeout expectations. That made `hide` look like Stripe reporting an unavailable wallet, contradicting the documented contract that an unavailable provider still records `onReady` duration.

- Define each override in lifecycle terms: whether the provider mounts, remains expected by the timeout, and can deliver `onReady`.
- Distinguish “probe omitted” from “probe mounted and Stripe reports unavailable”; they have different metrics despite both producing no visible wallet.
- Include the real unavailable-provider case in the matrix when it is central to the metric contract, even if the monkeypatch cannot force the provider response.
- Explain why omitted probes produce neither success nor timeout metrics so a correct tophat result is not mistaken for a regression.

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
