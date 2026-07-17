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

## Shopify is light on comments — code should be self-explanatory

Source: reviewer `m14t` on PR #899093 (2026-07-09).

> "Shopify has a preference that steers away from comments."
> "Shopify is light on comments. There is room when comments explain _why_, but
> should not explain _what_ the code is doing: the code should do that, and if it
> is confusing, could be refactored to be more readable."

Rules for myself:

- **Default to no comment.** Add one only to explain a non-obvious _why_ — a
  constraint, gotcha, or deliberate trade-off. Never to narrate _what_ the code
  does.
- If code needs a "what" comment to be understood, **refactor or rename instead**
  (extract a well-named function/variable) so the code carries the meaning.
- **In tests, put the intent in a descriptive `it(...)`/`describe(...)` name**,
  not a comment above the assertion.
- When in doubt, delete the comment.

## Follow the section's existing file/organization pattern — don't deviate

Source: reviewer `m14t` on PR #899093 (2026-07-09).

- Nit (`tests/utilities.tsx`): shared test **constants** belong in the section's
  `fixtures/*.ts` file; only **functions** stay in `tests/utilities.tsx`.
  > "I personally don't love it being spread across 3 files, but it's better to
  > follow the pattern and change them all at once than it is to deviate."
- Rant (`PaymentMethodCard.test.tsx`): pulling fixture data out to a separate
  file made it hard to see that the account ending `5678` should be enabled while
  `9999` should be disabled — the reader can't tell _why_ each case passes.

Rules for myself:

- Before adding a file/constant/helper, **find the section's existing convention
  and match it exactly.** If the convention is imperfect, follow it consistently
  rather than introducing a one-off local variation — and if it must change,
  change every instance together in one pass.
- **Keep the data that drives a test's pass/fail legible from the test.** Either
  co-locate it or name it so the discriminating value (enabled vs disabled,
  eligible vs ineligible) is obvious at the assertion site.

## Core (`//areas/core/shopify`) auto-reformats `db/data/*.yml` on save

A file watcher (started by core `dev up`) rewrites YAML data files (e.g.
`api_changes.yml`, `dynamic_experiments.yml`) shortly after they're saved —
converting `"..."` → `'...'` across the whole file. This produced a 4700-line
spurious diff.

- Fix: edit + `git add` + commit **atomically in one bash command** (beat the
  debounce), then guard on `git diff --cached --numstat` before committing.
- Restore the working tree afterward (`git checkout -- <files>`); the index keeps
  the clean change.

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

## PR descriptions: bullets over prose, keep the structure

Source: b2m-cta-cleanup restack (#907101/#915894), 2026-07-13. Two-part correction —
I missed twice in opposite directions.

1. First drafts were too verbose. The *structure* (## Stack Context / ## What? /
   ## Verification with bullet lists) was RIGHT, but I padded it with prose paragraphs
   that over-explained how/why — "## Why?" mini-essays, multi-sentence justifications.
2. Told "too verbose," I over-corrected into a tiny one-paragraph blurb that threw away
   the useful structure and the per-file detail. Also wrong.

What the user actually wanted (confirmed by their own manual edits to the PRs):
- KEEP the section headings and bullet formatting — it was correct.
- KEEP the per-file bullet list under "What?" — that detail is useful, not noise.
- REPLACE over-explaining prose with bullets. If a point fits in a bullet, make it a
  bullet, not a paragraph. Delete "## Why?" essays unless the reason is truly non-obvious.
- A short verification checklist is fine.

The fix for "too verbose" is prose→bullets + deleting justification essays — NOT
deleting structure or collapsing to one paragraph.

Also: never overwrite a PR body without reading its current state first — the user may
have hand-edited it on GitHub. My `gh` calls and the user share the same `zyqxd` account,
so `userContentEdits.editor.login` can't tell us apart; recover prior revisions with
GraphQL `pullRequest.userContentEdits { editedAt diff }` (the `diff` field returns each
revision's full body).

## PR descriptions: Why-before-What, cite the driving project, drop the meta-narrative

Source: user hand-edits to PR #937049 (Stripe Express ready-metric labels),
2026-07-15. Extends the existing "PR descriptions" lesson with ordering/content
rules confirmed by the user's own rewrite.

What the user changed in my draft:
- **Reordered to `Refs:` at top, then `## Why`, then `## What`.** Lead with the
  ref line and the reason; the mechanics come after. I had `## What` first with
  `Refs:` buried at the bottom.
- **"Why" cites the driving initiative with a link and frames product/user
  impact — not internal code smell.** Mine said the metrics were "inconsistent
  with the Load metrics and with each other." The user replaced it with the real
  trigger: a linked project (`#proj-...` Slack channel) shipped so *both* Apple
  and Google Pay can now appear at checkout, so "our metrics are ill-equipped
  with emitting what the user experienced." Anchor the Why to the concrete
  product change that made this necessary, with a link, in user terms.
- **Deleted the meta process narrative.** I ended with "_This is PR 1 of a 2-PR
  stack that supersedes the earlier 4-PR stack (#915999, ...)._" and a `---`
  rule. The user cut all of it. Reviewers don't need supersede-history or
  "PR N of M" framing. A plain inline link to the sibling PR where the
  complementary work happens is enough (e.g. "_#937051 will handle updating emit
  sites_").
- **Testing section = honest strategy, not padded pass-counts.** For a
  label-only / no-behavior PR the user replaced my "18/18, 51/51, ..." list with
  "Testing in this PR will be based on linters and CI. Tophatting will be done in
  <emission PR>." Match the verification claim to what the PR actually warrants;
  push behavioral tophatting to the PR that changes behavior.
- **Rationale phrasing for a retained-for-compat field:** say *why* in reviewer
  terms — "`surface` is retained for now to avoid a breaking change, however
  `source` will be used going forward" — not internal process ("gated on an
  Observe/ExP dashboard check").
- **Prefer concrete `2+` over mathematical `N`** in prose ("0 / 1 / 2+ wallets").

Rules for myself:
- Order: `Refs:` → `## Why` → `## What` → `## Testing`.
- Make "Why" the product/user story with a link to the driving project; don't
  justify a change purely by internal inconsistency.
- Never put stack/supersede history or "PR N of M" in the body; link the sibling
  PR inline instead.
- Testing section states the real verification for *this* PR; don't inflate a
  label-only PR with behavioral test counts.

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

## Never commit/push to a real PR branch without checking for the dev-only monkey-patch commit

Source: stripe-express-ready-metrics stack, 2026-07-16. A dev-only tophat
"monkey patch" (`[DO NOT MERGE]` commit `0b30ff1`, adds
`monetization-core/utilities/tophatExpressWallets.ts` + edits 4 Stripe Express
files) is cherry-picked onto the PR branches during tophatting. It slipped onto
real PR branches **twice**:
- `labels` (#937049): local branch had drifted to include it; a rebase surfaced
  it as a 3rd replayed commit — caught before pushing.
- `emit-both-surfaces` (#937051): it had been cherry-picked onto the local
  branch during tophatting; I committed a fix on top and **pushed the monkey
  patch to the PR** before noticing, then had to `git rebase --onto` it out and
  force-push a correction.

Rules for myself:
- **Before any `git commit`/`git push` to a branch that has an associated
  cherry-pick-tophat workflow, run `git log --oneline -5` and scan for
  `[DO NOT MERGE]` / the tophat commit, and `git ls-files <dev-only-helper>`.**
  If present, drop it (`git rebase --onto <clean-base> <monkeypatch-sha>`)
  BEFORE committing real work on top.
- After pushing, **verify the pushed diff**: `git diff --name-only origin/main..HEAD`
  should contain zero dev-only files (e.g. grep for the helper). Treat a nonzero
  count as an incident and force-push a correction immediately.
- The tophat monkey patch lives on its own branch (`…/tophat-monkeypatch`) and is
  cherry-picked ephemerally — it must NEVER be committed onto `labels` /
  `emit-both-surfaces`. Local branch state ≠ origin; a user tophatting in the
  same worktree can leave the cherry-pick behind.

## Working-contract violations to never repeat: no code comments, no PR-bot replies

Source: stripe-express-ready-metrics #937051, 2026-07-16 (user correction).

1. **No code comments unless explicitly asked — this includes prop/interface doc
   comments AND test comments.** I added a 3-line doc comment on a `readyGuardRef`
   prop and a 3-line comment above a test assertion. Both violated the standing
   "Shopify is light on comments" contract. The intent must live in the code
   (clear names) and, for tests, in the `it(...)` description — not in comments.
   Before committing, `git diff origin/main..HEAD | grep -E '^\+.*(//|/\*)'` and
   delete any comment I introduced.
2. **Never reply to the PR bot (binks).** Acting on a binks finding = fix the
   code, push, and let binks re-review on push. Do NOT post reply comments to
   binks threads (I did it 2×; had to delete them via
   `gh api -X DELETE repos/shop/world/pulls/comments/<id>`). No bot
   conversation, no "confirmed and fixed in <sha>" replies.
3. **Squash my commits before/when finishing.** Keep each PR a single clean
   commit (fixes from review rounds get squashed into the one commit, not left
   as a pile of follow-up commits). Use `git reset --soft <base>` + one commit;
   remove any review-round comments in the same pass.

Rule: at the end of every change, run a pre-handoff check — (a) no added
comments, (b) no bot replies posted, (c) branch squashed to one commit per PR,
(d) no `[DO NOT MERGE]` / dev-only files in `git diff origin/main..HEAD`.
