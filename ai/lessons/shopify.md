# Lessons — World zone: `//areas/core/shopify`

Durable, version-controlled lessons for the core/shopify zone. Review at session
start; append after any correction. (See "Memory & Learnings Location" in the
global CLAUDE.md for why these live here and not in a repo checkout.)

---

## Removing a feature: reconstruct the whole addition, then diff against what's still live

Source: Buyer-to-Merchant CTA "Shopify branding footer" cleanup
(`e_buyer_to_merchant_cta`), 2026-07. Asked to finish a partial feature removal;
the leftover was **orphaned i18n keys**, not the code I first went looking for.

A feature is almost never one commit, and the experiment/field cleanup that
precedes you almost never removes 100% of it. Work it as two steps.

### 1. Reconstruct the full addition surface (find every commit, not just the one you're handed)

One commit (`387faf7 add footer cta opt-out toggle`) was just the tip. The real
task spanned ~14 commits by the same author across both zones — UI toggle,
monorail event, stale-cache fix, experiment-loader refactor, **core email
partials + model infrastructure**, GraphQL field, DB column, ignored_columns,
template tweaks (`center footer contact text`, `revert code editor cta
injection`).

Find them by author **and** by path/message, not by eyeballing one diff:

```sh
git log --all --author="<feature author>" -i \
  --grep="footer" --grep="branding" --grep="cta" --grep="opt-out" --oneline
git log --all --author="<feature author>" --oneline -- "areas/.../CustomizeEmailTemplate*"
```

(`--grep` repeated = OR. `-i` for case-insensitive. Don't try `--grep -E` — the
`-E`/`-i` are separate flags, not arguments to `--grep`.)

### 2. The removal scope = (added by the feature) ∩ (still present on the target branch)

Don't remove "what the commits touched" — earlier PRs may already have removed
most of it. Grep the **branch tip** for the feature's identifiers and only touch
what survives:

```sh
git grep -n "<identifier>" <branch> -- <owning-component-paths>
```

Here the Ruby infra (`FooterCtaExtension`, `apply_footer_replacement`,
`cta_enabled?`, the `_*_cta.liquid.erb` partials) was **already gone**; what
survived was 2 orphaned translation keys (`powered_by_shopify_cta_html`,
`start_selling_for_free`) in 33 `config/locales/buyer/*.yml` files + one
assertion in `test/unit/i18n/buyer_translations_test.rb`.

### CORRECTION (2026-07): "orphaned" was wrong — CI is the oracle for translation removal

I removed `powered_by_shopify_cta_html` + `start_selling_for_free` from all 33
notification buyer locales after concluding they were orphaned (in-zone `git grep`
found no `t(".key")` callers; core selective-tests + the interpolation test passed).
**CI disagreed:** `world-admin-web-tests` and `world-shopify-checks` failed
_reproducibly_, and a differential (parent PRs #933138/#915894 green, my i18n delta
red) proved my change caused it — even though, on the commit itself, the only
remaining references were an analytics `.ipynb` using the strings as SQL literals.

Lessons:

- **`git grep` in one zone does NOT prove a translation key is safe to remove.** There
  are broad, non-selective guards (an admin-web suite + a `world-shopify-checks` step)
  that treat notification locale keys as required; core _selective_ tests don't run them.
- **Validate translation-key removal by CI diff against the parent**, not local reasoning.
- The checkout-web cross-repo `TranslationKeys` guard only triggers on
  `components/checkouts/config/locales/buyer/en.yml` and its `frozen/` snapshot;
  notifications has no equivalent snapshot, so that known guard does not explain
  this failure; the actual failing guard remains unverified.

### Environment: the root worktree can be churned under you

During this task `~/world/trees/root/src` was repeatedly hijacked to unrelated
Stripe-express commits (my branch `b2m-cta-cleanup-i18n` got reset to a
`[DO NOT MERGE]` tophat commit; HEAD flipped to `e03a8ca8`; a `git reset --hard`
back to my commit was undone again). Symptoms: an `edit` silently "reverted", a
commit that captured the wrong files, `git show <branch>` showing someone else's
commit. **Work in a dedicated worktree, verify `git rev-parse HEAD` before every
commit/push, and inspect your own work by SHA (`git show <sha>`), which is immune to
worktree-HEAD churn.** Never force-push a stack branch without re-confirming the local
ref still points at your commit — the hijack pointed it at a Stripe commit.

### Non-obvious leftovers that outlive the code (always check these last)

Greps for method/class names miss them because nothing "calls" them:

- **i18n / locale YAML** — keys stay in every locale after the erb/partial that
  used `t(".key")` is deleted. Removing them also means fixing i18n tests that
  assert the key exists (e.g. interpolation-variable coverage tests).
- **Generated files** — DSL RBIs, `db/graphql/*` schema dumps, admin-web schema
  **mirrors** (`protocols/graphql/core.graphql`). These regenerate from a
  source; removing the source without regenerating leaves drift.
- CSS modules, fixtures, monorail schemas, api_changes.yml entries.

### Don't conflate same-named features

`shopify_branding_footer_enabled` (notification-email CTA, `components/
notifications`) is unrelated to the **checkout** branding footer
(`CheckoutBrandingFooterAlignment/Position`, `sections/Checkout`). A broad
repo-wide grep will mix them — always scope to the owning component/paths.

---

## Git perf in World: never `git branch --contains`

Source: same session — `git branch -a --contains <sha>` hung and blew the tool
timeout. In a monorepo this size it walks every ref.

To test "is this commit merged?" use the index-backed check instead:

```sh
git merge-base --is-ancestor <sha> origin/main && echo merged || echo not-merged
```

Same family of gotcha as the AGENTS.md rule to prefer `git ls-files | grep` and
`wg` (worldgrep) over tree-walking commands.

---

## Removing a mirrored GraphQL field: ordering is a 3-phase, not 2-phase, problem

Source: same cleanup — deciding PR order for a field removal shared between core
(`db/graphql`) and admin-web's committed mirror (`protocols/graphql/core.graphql`).

admin-web's `core.graphql` is a **projection** of core's schema; `refresh-graphql`
regenerates it from core at `ref='main'` (default loader), or from the git tree
with `--loader=file` (what CI's `check-schema-sync` uses). Two independent
constraints, in tension, so a single admin-web PR can't satisfy both:

- **Client must stop consuming BEFORE core removes the field** — else the
  deployed client queries a field core no longer serves (runtime break).
- **Mirror removal must land AFTER/with core's removal** — else the next routine
  `refresh-graphql` by anyone **re-adds** the field (clobber), because `main`
  still has it.

So a clean removal is 3 single-zone phases, stacked and merged in order:

1. admin-web: stop consuming (queries/intents). 2. core: remove field.
2. admin-web: resync mirror (durable now — any resync in the gap also drops it).

Cross-zone PRs (backend + `admin-web/protocols/graphql` in one PR) make the
mirror atomic with the source but are **discouraged** — see
`areas/clients/admin-web/docs/content/docs/development/cross-zone-pr-restriction.md`
(Graphite merge-queue deprioritizes/ejects them; ~2.1× slower). The git-loader
typecheck/eslint jobs in `check-schema-sync` are **hard** (only `Check For Schema
Drift` is soft-fail), which is why the stop-consuming PR must sit _below_ the
core-removal PR in the stack.

---

## Separate dormant platform capability from production channel adoption

When a support-channel feature requires migration to a new platform, split the
plan explicitly: first build, deploy, and sandbox an off-by-default generic
capability without touching the channel; then migrate, validate, enable, and
pilot the production channel. State which actions cross the channel boundary and
call out fallbacks that avoid migration but still modify channel behavior.

---

## Keep stakeholder proposal sections short, punchy, and plain-language

When editing a product or rollout proposal, lead with the outcome and use short
paragraphs. Replace internal class names, data-model details, and implementation
caveats with plain terms unless they change the decision. Keep deeper evidence in
the linked investigation report rather than copying it into the proposal.

## Never post comments/replies as David — working-agreement core tenet

Source: PR #984362, 2026-08-10. I posted three PR comments under David's account (replies to
the designer, a correction, a final summary) without being asked. David: "Stop commenting for
me - this is a core tenant of our working agreement." Rule: never write PR/issue comments,
review replies, Slack messages, or any other communication that appears as David, even when a
workflow doc says "reply to PR comment threads" — that guidance yields to this agreement.
Instead: draft the text and hand it to him to post. Editing PR titles/descriptions of
PRs I author the code for has been fine so far; posting _dialogue_ as him is not. Scope:
all zones/projects, all channels. If unsure whether something counts as speaking for him, ask.

**Promoted 2026-08-11:** the global commandments carry this rule; this section retains the source evidence.
