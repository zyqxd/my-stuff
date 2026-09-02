# Lessons — World verification: builds, codegen, fastcheck, CI, tests

What actually proves a change works, and the ways a green signal lies.
Split out of `admin-web.md` on 2026-09-01 — the lesson text is unchanged.
Sibling files: `admin-web.md`, `world-git.md`, `checkout-metrics.md`.

## Fresh World worktrees have no generated GraphQL/TS declarations

`dev up --bare` does NOT start the dts daemon, so type-check fails with
"Cannot find module '\*.graphql'" / cross-project `.d.ts` missing.

- `pnpm run -r ... generate-dts` (packages) + `node scripts/typescript/generate-dts.ts <files>`
  (app projects) + `pnpm run refresh-graphql document-types` (generates `*.graphql.d.ts`).
- `changed-files.sh` chokes on untracked non-TS files (e.g. a stray `tasks/todo.md`); pass
  explicit admin-web-relative paths instead. (Keeping scratch/lessons out of the
  checkout — per the new memory location — also avoids this.)

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

## "does not provide an export named" after switching branches = stale Vite dep cache (2026-08-17)

**Symptom:** browser console on local `dev assets`:
`Uncaught SyntaxError: The requested module '/vite/assets/build/cache/vite8/admin/deps/<pkg>.js?v=...' does not provide an export named 'X'`.

**Cause:** switching a worktree between branches whose lockfiles pin different
versions of a package. `dev up --bare` installs the new version but leaves the old
one orphaned in `node_modules/.pnpm/`, and Vite's optimized-deps cache keeps
pointing at the orphan. Seen with `@shopify/extensibility-host-shared` 0.9.0 (no
`POS_EXTENSION_TARGETS`) vs 0.8.11 (has it).

**Diagnose before deleting anything** — prove it is staleness, not a real conflict:
1. `grep -c <SYMBOL> node_modules/<pkg>/build/esm/index.js` — installed copy has it?
2. `grep -c <SYMBOL> build/cache/vite8/admin/deps/<pkg>.js` — cached prebundle lacks it?
3. `build/cache/vite8/admin/deps/_metadata.json` — the entry's `src` names the wrong
   version's `.pnpm` path. This is the smoking gun.
4. `pnpm why <pkg>` — if it reports one version, the other is an orphan.

**Fix:** `rm -rf build/cache/vite8`, then restart `dev assets`. The cache is ~186MB of
regenerable build output; no source or config lives there. Leave the orphaned
`.pnpm/` directory alone — unreferenced, and hand-deleting inside `.pnpm/` risks
confusing pnpm's bookkeeping.

**Note:** the `cross-zone-package-linking` skill matches this error string, but it
only covers `LOCAL_PACKAGES`/`link:` for the polaris/sidekick/analytics groups. If the
package is outside those groups and you are not source-linking, suspect the dep cache.

**Scope:** any admin-web worktree reused across branches.

## fastcheck's type-check is per-file; a shared query needs the project pass

**Failure (2026-08-27, #7529 / PR 2021720).** Adding one field to
`NewAccountPricingQuery.graphql` made that field **required** of every existing
mock of `reactivationQuote` in the affected test suites. `fastcheck branch`
passed — twice — and CI's `:typescript: Type check` then failed with 8
`error TS2322`s: three wrong `__typename`s and a wrong enum in my new mocks
(`BillingSubscriptionChangeQuote`/`BillingPlan`/`BillingPeriod` instead of
`BillingSubscriptionReactivationQuote`/`Plan`/`BillingSubscriptionPeriod`), plus
two *pre-existing* fixtures that no longer satisfied the widened type.

**Why fastcheck missed it.** It type-checks changed files; the errors live in the
relationship between a changed `.graphql` and files it never opened, and in
generated `.d.ts` that only the project-wide `tsgo -p tsconfig.json` recomputes.

**Future action.** After changing a `.graphql` document, a shared type, or a
package export, run the project pass before pushing:

```bash
shadowenv exec -- pnpm exec nx run app-sections-<section>:typecheck   # ~1 min
shadowenv exec -- pnpm run typecheck:full                             # ~4 min, 169 projects
```

Order still matters (`refresh-graphql` → `generate-dts`). And read a mock's
`__typename` off the generated `.graphql.d.ts` rather than guessing from the
GraphQL type name — reactivation quotes are `BillingSubscriptionReactivationQuote`
with a `Plan`, and their period is `BillingSubscriptionPeriod`, not
`BillingPeriod`.

**Also:** `pnpm run typecheck:full` reports unrelated pre-existing failures in
this checkout (`app-sections-milestoneawards` cannot resolve
`@testing-library/user-event`). Compare against CI's own failure list before
chasing one.

**Scope.** admin-web. #lesson

## Verify oxfmt with CI's own command, not just fastcheck

**Failure (2026-08-27, PR 2021720).** `AUTOFIX=1 fastcheck branch` reported clean,
then CI's `:oxc: Oxfmt` step failed on one line in a file I had just edited — a
`createRouterFromManifest('inactive-account-subscribe:select-plan')` call one
character over the wrap width. `pnpm exec oxfmt --check <file>` flagged it
locally straight away, so the two paths disagree about scope or config.

**Future action.** CI runs `pnpm run lint:oxfmt` (`oxfmt --check` over the whole
tree, ~20s locally on 271k files). Run that, not just fastcheck, as the last
step before pushing a branch that touched TS/TSX. `pnpm exec oxfmt <file>`
rewrites a single file when you only need the one fix.

**Scope.** admin-web. #lesson

## A tophat means the branch goes in the worktree `dev assets` runs from

**Failure (2026-08-28, #7605).** Built the fix in an isolated worktree
(`~/world/trees/i7605-trial-legal-date/src`), opened the PR, and handed David tophat
instructions. He was tophatting from `~/world/trees/root/src`, which was still on a
different branch, so `local.preview.admin.shopify.com` served code that did not contain the
change. Nothing in the handoff said which worktree the branch lived in, so the mismatch was
invisible until he looked at the page and saw no difference.

**Why it happens.** A git branch can only be checked out in one worktree, and `dev assets`
serves whatever is in *its* worktree. Isolated worktrees are right for building and for
parallel work; they are wrong the moment a human has to look at the result.

**Future action.** When a change reaches tophat, move the branch into root before handing
it over: detach in the build worktree (`git checkout --detach`), `git checkout <branch>` in
root, re-run `dev up --bare` if `areas/clients/admin-web/pnpm-lock.yaml` moved between the
two HEADs (it does whenever the bases differ), then restart `dev assets`. Say in the
handoff which worktree is serving and at which SHA. Switching a branch away never deletes
it, so the branch previously in root survives -- but check for uncommitted work there
first.

**Scope.** admin-web / World worktrees. #lesson

## `AUTOFIX=1 fastcheck` rewrites the repo-wide oxlint suppressions file

**Failure (2026-08-28, #7605).** Ran `AUTOFIX=1 shadowenv exec -- fastcheck` to fix a
`max-lines` violation. It fixed nothing relevant, and `git status` then showed
`areas/clients/admin-web/oxlint-suppressions.json` modified — ~30 pruned entries for
`packages/admin/dev-ui/ActivatorTooltips/*`, files I never touched. AUTOFIX regenerates
that file globally, not scoped to changed files, so it sweeps in every suppression that
has since gone stale anywhere in the zone.

**Future action.** After any `AUTOFIX=1 fastcheck`, run `git status --short` and revert
`oxlint-suppressions.json` unless the change is genuinely yours. Prefer plain `fastcheck`
plus a targeted `pnpm exec oxlint --fix <file>` when the failure is in one file. Real
lint failures (`max-lines`, etc.) still need a real fix — AUTOFIX cannot solve them.

**Scope.** admin-web. #lesson

## A fresh worktree fails type-check on untouched lines until codegen runs

**Failure (2026-08-28, #7605).** First `fastcheck` in a brand-new worktree reported
`TS2307 Cannot find module '@admin/context/react'` plus `TS2339 Property 'totalPrice'
does not exist on type '{ plan: { name: string; }; period: unknown; }'` on lines I had
not touched. The second error class is the tell: a generic like
`findSelectedChangeQuote<T extends {plan: {name: string}; period: unknown}>` collapses to
its own constraint when the GraphQL type argument is missing, so the errors point at
consumer code while the cause is absent codegen. `*.graphql.d.ts` is gitignored, so a
fresh checkout has none.

**Future action.** In a new worktree, before reading any type-check output, run
`pnpm run -r --workspace-concurrency=10 --silent generate-dts` then
`pnpm run refresh-graphql`. Never start debugging types on untouched lines first.

**Scope.** admin-web. #lesson

## A stranded PR's body is not evidence about its diff — run its own advertised gate

**Failure (2026-08-28, #7241 planning).** An earlier analysis report
(`~/plans/stripe-express-ready-metrics/2026-08-28-7240-stack-order-and-port-analysis.md`,
"Hazard 2") concluded that reference PR shop/world#996927 "already does the rework
correctly" and could be treated as a clean model. It does the opposite: it strips
`getDiagnosticOptions(...)` off the `checkout_express_pay_state_at_submit` emit, so that
~51.8K rows/day event silently loses `merchantCheckoutViewId` and `identity` on every host
that supplies a diagnostics context — i.e. all five checkout surfaces. The PR body
*advertises* the verification gate
`git diff … | grep -cE '^[+-].*EXPRESS_PAY_STATE_AT_SUBMIT'` with an expected value of `0`.
Run against its own diff it returns `8`, and the PR's own modified test pins the loss
(`'view-id-1'` → `undefined`).

**Why it happened.** The claim was read out of the PR description, which stated confidently
that the event was "not touched". Nobody ran the gate the description offered.

**Future action.** When prior art carries a self-described invariant or verification
command, run that command against the artifact before repeating the claim — and when the
artifact is a diff, grep the diff. Quote the observed value, not the author's expected one.
A stranded PR's body describes the state its author intended, which can differ from the
state the branch is in.

**Second-order lesson from the same session.** A reference implementation can also be
wrong in ways its own review never caught: #996927 built
`customFields.selectedPaymentMethod` from React render state
(`currentState.selectedPaymentMethod.type`), which is never updated on the submitting
Stripe Express branch — the only writer, `createEphemeralCardForStripe`, is reached solely
from `vaultStripeExpressWithoutSubmit`, the branch that deliberately never submits. Wallet
rows would have reported `CREDIT_CARD`, on exactly the population the work exists to
measure. Reading prior art means re-deriving its data sources, not just its structure.

**Scope.** admin-web `packages/shared/monetization-core` checkout diagnostics; generalises
to any port/reference-implementation review. #lesson

## `devx ci run` reads the branch's upstream, not its name

**Failure.** On branch `shimmer-started-7239`, `devx ci run` refused with
`Cannot trigger CI on main or release branches`. The branch is not main — but its upstream
is: `git worktree add -b <new> <path> origin/main` sets `branch.<new>.merge = refs/heads/main`,
and `devx` resolves branch identity through that.

**Future action.** Pass the branch explicitly: `devx ci run -b <branch>`. Do **not** "fix" the
tracking with `git branch -u` — that writes `.git/config`, which the World hard rules forbid.
Same trap applies to any tool that infers the current branch from upstream rather than HEAD.

Diagnose with `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (read-only).

**Scope.** Any World worktree created with `git worktree add -b … origin/main`. #lesson

---

## A mutation that stays green is the only proof an assertion is fake

**Failure (2026-08-31, #7241 story 3).** I specified a test assertion meant to stop an intent
enum from becoming a parking lot: "assert no `unreachable` intent appears in any
`formData.set/append('intent', …)` inside `useCheckoutSubmitActions.ts`". The implementing agent
wrote it, ran the paired mutation (move `new-paypal` from `emitting` to `unreachable`), and the
test **stayed green**. Cause: at runtime the function source contains `CheckoutIntent.NewPaypal`,
never the literal `'new-paypal'`, so a regex over `fn.toString()` can never match the intent value.
The assertion was decorative. It would have shipped as coverage.

**What saved it** was the plan pairing every assertion with a *named mutation that must make that
named test fail*, and the agent stopping when the mutation didn't bite instead of quietly
rewriting the assertion to pass.

**The fix, and the general rule.** Replace source-text introspection with a behavioural assertion
over things the suite already exercises. Here: extract the `it.each` invocation table to a shared
const and assert `new Set(TABLE.map(t => t.expectedIntent))` equals `new Set(emitting)`. It fails in
both directions — an intent parked in `emitting` that nothing produces, and a real intent
misclassified as unreachable — and it immediately found a missing `ephemeral-shop-pay-plan-change`
case. Reject `fs.readFileSync` variants: a test that greps its own source is brittle to formatting
and is not a pattern this zone uses.

**Future action.** For any assertion that isn't obviously behavioural, write down the mutation that
must kill it *before* writing the assertion. If you can't name one, the assertion is probably
decorative. Never let an agent "fix" a non-biting mutation by adjusting the mutation.

## Vitest green says nothing about lint or types

Same session: a story was rejected at review for two new `jest(prefer-strict-equal)` oxlint errors
(`toEqual` on a `Set`) with a fully green vitest run. `fastcheck branch` must pass **before each
commit**, not only at the end of the branch — otherwise the failure surfaces one review round late.
`AUTOFIX=1 shadowenv exec -- fastcheck uncommitted` while iterating; full `fastcheck branch` before
committing. Never `oxlint --suppress-all`, which the tool itself suggests — it is a lint escape.
