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
- Do not reply to binks; fix the code, push, and let the bot review again.
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
