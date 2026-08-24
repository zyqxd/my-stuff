<!-- 2026-08-16 20:45:35 [01a00d19] -->
## pi-memory + qmd setup (2026-08-16)

- **Pi package source of truth is `~/.pi/agent/settings.json`** (`packages` array), NOT `~/.pi/agent/npm/package.json`. The latter is generated; any `pi` command reconciles it from settings and silently reverts manual edits. Use `pi install` / `pi remove` / `pi list` (not `pi package ...`, which is not a command). #lesson
- Removed junk placeholder packages `npm:pi-ai` and `npm:pi-coding-agent` (empty name-reservation stubs by Armin Ronacher). They never satisfied pi-memory's peers.
- **The pi-memory peer-dep warning for `@earendil-works/pi-ai` / `pi-coding-agent` is cosmetic** — pi bundles them in its own runtime (`~/.pi/pkg/pi-<ver>/node_modules/@earendil-works/`) and injects them at load. Never "fix" it by installing lookalike packages. #lesson
- `memory_search` requires qmd for **all** modes including `keyword` — it gates on qmd availability before branching on mode. Other memory tools work without qmd.
- **qmd install on this machine (Shopify toolchain blocks global `npm` and `npx`):** installed via `PNPM_HOME=~/.local/share/pnpm pnpm add -g @tobilu/qmd` (v2.5.3).
  - pnpm 10 blocks native build scripts; added `pnpm.onlyBuiltDependencies` (better-sqlite3, node-llama-cpp, tree-sitter-*) to `~/.local/share/pnpm/global/5/package.json` and re-ran `CI=true pnpm install`.
  - `better-sqlite3`'s `prebuild-install` **exits 0 while producing no binary** on Node 24 (ABI 137), so the `|| node-gyp rebuild` fallback never fires. Had to run `pnpm dlx node-gyp rebuild --release` manually in its `.pnpm` dir. #lesson
  - PATH: `~/.local/share/pnpm` is not on PATH and pnpm's shim resolves its payload from `dirname($0)`, so it **cannot be symlinked**. Wrapper script at `~/.local/bin/qmd` (already on PATH) execs the real shim.
  - Shell rc files (`~/.zshrc`, `~/.bashrc`) are owned by the Shopify `tec` agent — do not inject into them. #preference
- Verified: qmd 2.5.3, collection `pi-memory` created, embeddings ready, all three search modes (keyword/semantic/deep) return results in a fresh pi process.

<!-- 2026-08-17 refine-memory (approved audit 2026-08-17) -->
## Agent tooling facts (2026-08-17)

- Agent-file symlinks: `~/.pi/agent/CLAUDE.md`, `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` → `my-stuff/ai/AGENTS.md`; `~/.pi/agent/memory` → `ai/memory`; skills linked per-directory from `ai/skills/`.
- **pnpm global fragility:** a future `pnpm add -g <pkg>` can rewrite pnpm's global `package.json` and drop `pnpm.onlyBuiltDependencies`; `setup.sh agents` won't repair it (the qmd short-circuit passes). Symptom: `better_sqlite3.node` "tries" stack trace after a qmd upgrade; fix: `pnpm dlx node-gyp rebuild --release` in its `.pnpm` dir.


<!-- 2026-08-18 09:56:22 [01a01013] -->
## world worktree cleanup — `git-monorepo-cleanup` (2026-08-18)

- The "world-clean" tool is `~/Workspace/my-stuff/bin/git-monorepo-cleanup`. On 2026-08-18 it removed `~/world/trees/root/src` (the admin-web sparse home checkout) twice. **No commits lost** — branch was merged, still on origin; only gitignored files (node_modules, .env) died. #bug
- **Root cause:** the script's only structural guard is `tail -n +2` on `git worktree list`, which assumes entry #1 is the primary checkout. `~/world/git` is a **bare** repo, so entry #1 is the bare entry and the guard protects nothing — a long-lived home worktree is indistinguishable from a throwaway one. #lesson
- **`git worktree remove` refuses when untracked files exist, but silently deletes ignored files** (verified empirically). The script's `--untracked-files=no` cleanliness check is blind to untracked files, so git's own refusal is the load-bearing safety net. Never add `--force` to that call. #lesson
- `--force-gone` (there is no `--force` flag) exists because squash-merges mean merged branches never become ancestors of main, so `is_merged` fails forever and "upstream gone" is the only signal. Shopify squash-merges, so the risky flag is also the useful one — and it widens **worktree** removal too, not just branches.
- **Protecting a worktree:** `git worktree lock <path>` (preferred), a `.no-cleanup` marker file, or `--protect-path ERE`. `~/world/trees/root/src` is now locked ("primary admin-web checkout").
- ~~Worktrees on active unmerged branches are silently skipped~~ — **fixed 2026-08-24 (839c781): every worktree is now listed with its status.**

### 2026-08-24 update (commit 839c781) — two guards added, report rewritten

- **`world-clean` is an alias in `preferences/bash/profile`** and it passes **`--force-gone`**: `git -C ~/world/trees/root/src monorepo-cleanup --protect "^(main|master|brain-team-memory-banks)$" --force-gone`. Never reason about its output as if defaults applied.
- **It does NOT update local `main`.** Step 1 updates `refs/remotes/origin/main` only, and `main` is in `PROTECT_RE`. On 2026-08-24 local `main` was **6920 commits / 3 days behind** `origin/main` while the tool reported success. Always rebase onto `origin/main`, never `main`. #lesson
- **It does NOT retire tophat / code-review branches.** `is_gone` reads `branch.*` config, and **80 of 106** local branches have no upstream config, so they can never be gone-detected; Shopify squash-merges, so `is_merged` never fires either. They accumulate as `STALE` forever (57 of them). Of 78 no-upstream unmerged branches, **48 had no same-named branch on origin** — that signal is now *reported* (`--list-stale` shows `not on origin`) but still never acted on. #lesson
- **`STALE` is report-only** — the code prints and `continue`s. Only `delete` / `remove` / `prune` lines are actions. A wall of STALE lines is not a threat.
- **Guard A, unrecoverable files:** the test is whether **git tracks the file**, not its name. Old guard was `-maxdepth 4 -name '.env'`, which missed `admin-web/config/env/.env.development` (depth 5, prefixed) *and* blocked on a **tracked** `areas/platforms/organizations/.env`. Now matches `.env`/`.env.*` at any depth and only blocks when untracked. Costs ~10-25s, so it runs only for removal candidates. Override `--drop-env`. #lesson
- **Guard B, unreachable commits:** a **detached** worktree is the only place a commit can live with no ref pointing at it. `~/world/trees/6154-wait-lifecycle/src` was at `77ea93a2` with 2 such commits and would have been removed via the `detached HEAD, clean` path — it survived only because an unrelated `.env` matched the old guard. Uses `for-each-ref --contains` so rebased work counts as reachable. Override `--drop-orphan`. #bug #lesson
- **The dry run used to under-report branch deletions.** Selection skipped any branch with a non-empty `%(worktreepath)`; in a dry run the worktrees still exist, so branches that `-y` deletes in the *same* pass were invisible (2 were hidden). Now shown, marked `(worktree removed above)`. **A dry run is not automatically a faithful preview — check whether earlier steps change later inputs.** #lesson
- **Verifying "no work will be lost" is one command:** `git rev-list --count origin/main..<branch>`. `merged into origin/main` is a real `merge-base --is-ancestor` test against a just-fetched ref, not a PR-status guess. Non-ancestry does **not** mean unique work — check patch-ids before believing a detached HEAD holds something new.
- Running the script from the **bare** dir (`~/world/git`) dies with `cd: null directory` and prints nothing, because `git rev-parse --show-toplevel` fails there. Run it from a worktree (the alias uses `git -C`). Still unfixed.


<!-- 2026-08-18 20:56:46 [01a0177d] -->
## Prior art for Mona-supporting-ATC (#help-monetization) — 3 repos (2026-08-18)

Report: `~/plans/monet-slack/2026-08-18-prior-art-mona-atc-repos.md`. Consumed by [[monet-slack]].

- **`~/Workspace/verdant-help-monetization-grokt`** = a checkout of **`Shopify/verdant-web` (Verdant Express / "Vex")**, the org-wide **production** Slack support-bot platform, + 3 local unpushed commits registering **Grokt MCP scoped to `C026ATXN24C` (#help-monetization)**. Vex is the **incumbent** doing what Monet is proving. The `#help-monetization` intake bot ("Monet Bot": urgency prompt, assignment, ":white_check_mark: marked … as resolved") is a **Verdant-family bot** — its texts match `app/models/messages/{urgency_prompt,bot_resolution}.rb`. Vex supports **per-channel MCP scoping** and **Streamable HTTP MCP only**. #decision-input
- **Vex judge**: `BotAccuracy` scores 0–100 in 6 config-driven bands (`config/bot_accuracy_ranges.yml`). Production distribution is **bimodal with an 85–89 "rubber stamp" cluster vs 95–100 "actually great"** ⇒ `MINIMUM_GOLDEN_SCORE = 95`. **Look for the score cliff; never pick a judge threshold a priori.** Accuracy is skipped when `Resolution.kind == "bot"` or channel is FAQ-mode (don't grade the bot against itself / verbatim content). #lesson
- **Resolution ground truth ranking** (from mona-catalog): deterministic intake-bot **marker = 0 false positives** > conservative LLM assessment for 7-day-stale threads (`confidence ≥ 90` only) > free LLM opinion (advisory field only, ~14% resolve in-thread with no marker). #lesson
- **`~/Workspace/mona-vex-answer-api-poc`** = `Shopify/monetization` + POC branch adding **`tools/mona-cloud` `POST /internal/v1/answers`** — a stateless HTTP Mona answer API (read-only `monetization-support` profile, 2 repo tools, `contextVersion` SHA excluding the caller prompt, 8-tool budget, 180s shared deadline, Cloud Run IAM/OIDC + **non-personal team token from Secret Manager**). **This is monet-slack ADR-0006 option 2, already drafted.** Named gaps: no `requestId` idempotency record, raw freshness string, no circuit breaker.
- **`mona.shopify.io` cannot host Mona** — it is a WebSocket relay to a **laptop bridge routed by email**. The Mona **assistant WebSocket** (`ws://localhost:3847/ws`) has **no `allowedTools`/`disabledTools`** (only `browserEnabled`, `disabledSkills`) and core tools include `bash`/`write`/`edit`/`slack` ⇒ the only safe posture over WS is rejecting tool-call events. Use the **in-process `loop({tools})`** or the HTTP answer API. #decision
- **Quick is not compute**: static hosting + browser-side APIs (`quick.db`/`quick.ai`/`quick.user`), **no server-side execution and no server-side write path**; `quick serve` 307-redirects `/client/quick.js` to an IAP-gated URL, so you must **develop against the deployed `*.quick.shopify.io` site**. #lesson
- **Evaluator design that works** (mona-catalog e01s16): synthesize the reference resolution **once** (3–5 sentences, ≤35 words each, cited transcript line numbers), freeze it, and re-run only candidate + scorer per prompt version. The prior regenerate-and-re-judge-every-run design hit 3,000+ lines and ~70 min for 21 cases with no usable metric. Score on **4 anchored tiers** + normalized completion `sum/(3×eligible)`; resume by `case_id`+`source_sha`+`prompt_hash`; changed identity ⇒ **new output file, don't mix**. #lesson
- **Never persist a partial/errored row over a good one** — mona-catalog corrupted ~885 rows because a failed categorization still wrote and `quick.db.update()` **merges** (stale labels + new provenance). #lesson #bug


<!-- 2026-08-19 15:06:13 [01a01a64] -->

## admin-web currency formatting (2026-08-19)

- **`@shopify-internal/i18n` `formatCurrency(..., {form: 'explicit'})` has the symbol==currencyCode case built in** — it calls `formatCurrencyShort` and only appends the code when the short form does not already contain it. So CHF/OMR render `CHF 39.00`, never `CHF 39.00 CHF`. Do **not** hand-roll this in admin-web (Brochure had to; admin-web does not). #lesson
- Corollary trap: `explicit` **always suffixes** the code (no locale branch), and when the code is already inside the short form it cannot be split into a smaller span — so a design that styles the code differently must lift it out of the formatted string, not conditionally append it. Full detail in `~/Workspace/my-stuff/ai/lessons/admin-web.md`.


<!-- 2026-08-20 09:43:43 [01a01f68] -->

<!-- pi package removal -->
- **`pi remove` can fail to match relative path packages** in `~/.pi/agent/settings.json` (e.g. `../../Workspace/pi-figma-mcp` → "No matching package found", even with the exact string). Fix: edit the `packages` array in `~/.pi/agent/settings.json` directly, then verify with `pi list`. Deleting the target directory alone does NOT remove the entry, and the stale entry still causes duplicate tool/flag registration errors (`Tool "mcp" conflicts with ...`). #lesson #bug


<!-- 2026-08-20 15:27:34 [01a0205e] -->
## Impact attribution habits (2026-08-20) #preference [[impact-attribution]]

David wants attribution-to-impact baked into his workflow. Enforce during work, unprompted:
1. **Issue creation**: every issue must chain to a project — `#gsd:` label or board/epic link. Flag orphans (his diagnostics epic #7237–#7247 was orphaned).
2. **PR authoring**: body must `Closes <issue>`; verify the issue has project linkage; include one "Impact" line (metric/decision this serves).
3. **On merge**: add a scratchpad item "close the loop on PR #X — post first-readout comment (+~7d after deploy)" with the issue link.
4. **Close-the-loop comment**: after deploy, draft a dated, quantified comment (BQ query + numbers) for David to post on the issue/project channel. Never post as him.
5. **Ledger**: append landed impact one-liners to `~/plans/impact-ledger.md`; brain dailyContext Completed entries should carry "→ outcome" when known.
6. **Experiment readouts**: remind him to get named as eng contributor on readout docs (e.g. e_improve_cancelled_reactivation).

<!-- 2026-08-20 15:29:04 [01a0209c] -->

## PR body conventions (2026-08-20) — see `~/.pi/agent/skills/describe-pr/SKILL.md` for the full rules

- **Section order: Summary → Context → Tophat → Stack.** Reviewers read the Summary and go straight to the code; `Context` is for when the diff confuses them, `Stack` only to re-orient mid-review. Never make a reviewer understand a stack's shape before they can read the diff. #preference
- **GitHub callouts: max one per body, default zero.** Only `[!IMPORTANT]` (must not be approved/merged as-is) or `[!WARNING]` (damage if merged/deployed out of order). `NOTE`/`TIP`/`CAUTION` are banned — in a PR body they never change reviewer *action*, so they're a sentence in Context wearing a costume. A count is enforceable; "sparingly" degrades to two or three. #decision
- **Stack is a map, never an explanation.** Prose narrating sequencing, coupling, prerequisites, or overlap is a defect — that's back-stacking design, not reviewer information. Route it: "don't merge yet" → the callout; "a prerequisite exists" → the `Status` cell; "why the stack is shaped this way" → the issue or a PR comment. If the callout already carries the blocker, the Stack section usually earns deletion.
- Budgets: Summary lead ≤60w / 3 sentences (was 200w — that cap licensed run-on paragraphs); Summary bullets ≤25w, no rationale or file-by-file tour; Context ≤80w / 1 para. **Tophat has no cap** — David wants reproducible testing instructions.
- #lesson When editing a skill's rules, check its `evals/` in the same pass. describe-pr's evals had drifted a full rule-change behind the SKILL.md before anyone noticed.


<!-- 2026-08-21 18:04:23 [01a0252d] -->

## Sidekiq Pro / Enterprise 401 in World (recurring, 2026-08-21; also 2025-08-25)

**Symptom:** `bundle install` / `dev up` in any Ruby zone fails with
`Bundler::HTTPError: Could not download gem ... enterprise.contribsys.com ... bad response Unauthorized 401`
for `sidekiq-pro`.

**Root cause is NOT local.** Shopify's Sidekiq Enterprise subscription lapses and
contribsys revokes download access. Precedent: the vendor emailed Accounts Payable
"Since you have not paid your invoice, we have removed software access from your
account." Tracked in **#help-procurement** (Zip request #6508 "Sidekiq Enterprise").
2025 occurrence resolved in ~1 day. Never "fix" this by editing a credential into a Gemfile.

**Diagnostic facts worth reusing:**
- The credential is hardcoded in each zone's Gemfile: `source 'https://<user>:<pass>@enterprise.contribsys.com/'`.
  It is **identical across zones** (organizations, banking, shop-server, flow) and unchanged
  since "Initial monorepo-ready move" — so a 401 is never per-zone drift. #lesson
- **`https://enterprise.contribsys.com/specs.4.8.gz` is PUBLIC** — it returns 200 with no auth
  and with a garbage credential. A 200 there proves nothing about the license. The real test is
  a gem download: compare real credential vs garbage; if both 401, the license is dead. #lesson
- `package-proxy.shopify.io` does **not** mirror contribsys (no contribsys support in
  `//areas/incubating/package-proxy`, `//areas/tools/dev`, `//areas/tools/bundler-wrapper`).
  Only `BUNDLE_MIRROR__RUBYGEMS__ORG` is set by shadowenv, so sidekiq-pro always fetches direct.

**Why it surfaces suddenly:** a warm gem cache hides it. GEM_HOME is keyed by the zone's Nix
env hash (`~/.dev/gem/<hash>-dev-shell-shadowlisp`). When the env rebuilds, the hash changes,
the new GEM_HOME is empty, and bundler must actually download — exposing the dead license.

**Local unblock (worked 2026-08-21):** find the gem in an older GEM_HOME and reinstall it:
```
ls ~/.dev/gem/*/cache/sidekiq-pro-*.gem                    # find a warm copy
CUR=$(shadowenv exec -- printenv GEM_HOME)
cp <old>/cache/sidekiq-pro-X.Y.Z.gem "$CUR/cache/"
shadowenv exec -- gem install --local "$CUR/cache/sidekiq-pro-X.Y.Z.gem" --ignore-dependencies
shadowenv exec -- bundle check     # => "The Gemfile's dependencies are satisfied"
```
Local only — CI and any fresh env still fail until procurement restores the license.


<!-- 2026-08-24 10:50:01 [01a0252d] -->

## admin-web: `fastcheck` cannot verify a shared-type change (2026-08-24) #lesson

`areas/clients/admin-web/scripts/fastcheck/type-check.sh` type-checks **only changed
files** (it says so in its own header comment). So when you change a *type* that other
files consume, `fastcheck` returns exit 0 while real `TS2322`/`TS2719` errors sit in
unchanged consumers. CI runs the full affected graph and will catch them; you won't.

I hit this twice in one day on the same PR (#1008555):
1. Widening `customFields` to `DiagnosticCustomFields` — real `TS2322` in the unchanged
   `useCheckoutSubmitActions.ts`.
2. Narrowing the hook's `DiagnosticEvent` — real `TS2719` in the unchanged `Checkout.tsx`,
   because `emitSkipDiagnostics.ts` kept its own duplicate interface with
   `customFields?: {[key: string]: unknown}`. Under `strictFunctionTypes` a callback
   accepting the narrow type is not assignable where the wide type is expected.

**Rule:** after changing any exported/shared type, type-check its consumers explicitly:
```
FILES=$(grep -rl "<module-path>\|<TypeName>" --include=*.ts --include=*.tsx app packages | sort -u)
shadowenv exec -- ./scripts/fastcheck/type-check.sh $FILES
```
Then mutation-check: revert the fix, confirm the error reappears, restore.

Also: `tsc -p tsconfig.json` at the admin-web root checks **nothing** — the root tsconfig
has `include: []`. Never use it as evidence.

**Related smell:** a structurally-duplicated interface in a second file is how these
breaks happen. `DiagnosticEvent` existed in both `app/signup/hooks/useMerchantCheckoutDiagnostics.ts`
and `app/signup/components/Subscribe/Checkout/utilities/emitSkipDiagnostics.ts`. Grep for
sibling declarations of any shape you are narrowing before you narrow it.

<!-- 2026-08-24 -->
### `git up` + main freshness in the bare+worktrees layout (2026-08-24, commit 03ca327)

- **`git up` now moves local `main`.** Its old `merge --ff-only` path was dead code: it tested `symbolic-ref HEAD == main` in the *current* worktree, but in a bare+worktrees layout `main` is only "checked out" in the bare entry where `git merge` cannot run. Local main had frozen **7266 commits** behind while every fetch reported success. #bug
- **A bare "checkout" does not block ref updates.** `main` reports `worktreepath = ~/world/git`, but both `git fetch origin main:main` and `git update-ref` succeed there — git only refuses to move a branch checked out in a **non-bare** worktree, because a bare entry has no index or working tree to desync. #lesson
- **When testing this, the bare repo's HEAD is the whole point.** A throwaway bare clone defaults to `HEAD -> refs/heads/master`, so `main` has an *empty* worktreepath and the condition is not reproduced. Must `git symbolic-ref HEAD refs/heads/main` to get a faithful replica. First attempt proved the mechanism, not the case. #lesson
- **`git worktree add -b NEW <path>` bases on the *invoking worktree's* HEAD**, not on local `main` — so stale main is mostly harmless from a worktree, but bases on **stale local main** when run from inside the bare dir. Verified with distinct commits; an earlier test was confounded because the worktree happened to sit on the same commit as stale main. #lesson
- **OPEN: `git-wt`'s new-branch path has no explicit base** — `git worktree add -b "$b" "$path"` inherits the invoking worktree's HEAD, so `git wt new-thing` from a feature worktree silently stacks on that feature branch. Should base on `refs/remotes/origin/main`. Not yet fixed.
- `monorepo-cleanup` reports main drift in its header (`local main is N commits behind — run: git up`) but never moves it; `main` is in `PROTECT_RE` and mutating a protected branch inside a destructive-hygiene tool would contradict that list. #decision
