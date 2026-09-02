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

- Symlink map moved to `ai/README.md` on 2026-09-01 (derivable from `ls -la ~/.pi/agent/`).
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

<!-- 2026-08-24 19:47:24 [01a03618] -->

<!-- communication preference, 2026-08-24 -->
<!-- merged 2026-09-01 from five entries: 08-24 response shape, 08-25 park-the-findings
     (its "park in the report file" clause RETRACTED same day), 08-25 correction,
     08-26 inform-don't-perform, 08-27 recurrence. Promoted to AGENTS.md §Communication. -->
## David — reply shape #preference #lesson

The rule now lives in the constitution (`ai/AGENTS.md` → **Communication**). It was
promoted on 2026-09-01 because it failed four times in four days while sitting in
searched memory. This entry keeps the evidence and the sharp edges.

**The single test of a reply: did David understand the answer to his question?**
Everything else is optional and must *look* optional.

- **Trigger.** A question shaped `why… / where… / have you… / is it… / which…` is a
  single-fact question. Answer the fact. Stop.
- **Answer first, complete, and alone** — nothing interleaved. No caveats mid-answer,
  no adjacent findings, no implications woven in. Lead with the verdict, including
  disagreement: a flat "no, because X" beats "right instinct, wrong lever" hedging.
- **Then a distinct, clearly skippable section** under its own heading. Never above the
  answer, never mixed into it. **The extras are wanted** — do not suppress them and do
  not exile them to a report file. Volume was never the complaint; placement was.
- **Every sentence hands over a fact.** Delete sentences whose job is effect: teasers,
  suspense, throat-clearing ("It's worth noting"), restating what's coming, praising the
  artifact's own virtues ("it caught a subtlety I'd have missed").
- **Calibrated words.** A size or importance claim is a measurement or it is dropped.
  Banned: goldmine, game-changer, crucially, "the real problem", "not just X", massive,
  dramatically. The `X, not just Y` sentence frame is banned even without the phrase.
- **Machine-like = template over thought:** bold-label bullet walls, three bullets that
  could be one sentence, formulaic transitions. Prefer plain declarative sentences.
- **When corrected, acknowledge in one line.** A post-mortem about being too long is the
  same mistake wearing a hat.

**Test before sending:** strike every clause that would still be true if the underlying
fact were wrong. If a sentence survives only as commentary, delete it.

**Root cause, and it is not verbosity.** Finding something adjacent while answering feels
like value. Thoroughness in *investigation* is the job; thoroughness in *the reply* is
friction.

**Recurrences:** 08-25 one-question ask answered with a table + two ambiguity classes + a
re-query plan + a design implication (he asked twice); same day on "have you pushed the
branch" and "give me a table"; 08-26 clickbait framing; 08-27 self-praise on the #7239 plan
handoff.

Applied to context-switching STATE summaries ([[context-switching]]): 5 fixed slots, one
line each, concrete identifiers only (PR#/SHA/path/count), `next` starts with a verb, facts
not significance ("228/228" not "great shape"). Banned-word grep + line cap as deterministic
lint. Test: resume in 30s from the head alone.

Full lesson: `~/Workspace/my-stuff/ai/lessons/admin-web.md` → "Answer the question first; keep the findings, move them".

<!-- 2026-08-25 16:29:19 [01a034b6] -->

<!-- code-comment bar, 2026-08-25 -->
## Comment bar — the code has to be unreadable without it #preference

#7343 shipped 61 added comment lines; David cut it to **11** over two rounds of raising the bar. "Explains why not what" and even "would someone undo this?" are both too lenient — I can always imagine someone undoing something.

**Cut it if** a shared variable already enforces the invariant, a named `it(...)` already documents it, the effect is visible on page load, or it explains an *absence*.

**Keep it for** a magic constant's derivation (`calc(20 + 4)` → "chevron icon + its gap"), a rule that exists for one surface only (`[mobile-bridge]`), a normative requirement (a WCAG criterion number), an identity behind a boolean, or a format quirk that explains why a function exists.

Root cause: I write comments while reasoning, so notes-to-self survive into the diff. **The reasoning goes in `~/plans/<project>/`, not the source.**

Also: never gut someone else's comment — compress and flag it. And match whole blocks when editing comments programmatically; matching a tail leaves dangling half-sentences.

Full lesson: `~/Workspace/my-stuff/ai/lessons/admin-web.md` → "The comment bar".

<!-- 2026-08-26 16:00:32 [01a03f28] -->
<!-- 2026-08-27 16:33:19 [01a03f28] -->
<!-- build-loop protocol, 2026-08-27 -->
## David — build-loop review protocol #preference

For orchestrated builds ([[context-switching]] and future projects): **every task/story ends with a fresh reviewer subagent** auditing the commit against the story's acceptance + verify block (reviewer re-runs verify itself, never trusts the implementer's paste; verdict-first protocol, one fix round then fail-fast). **Every sprint/epic boundary ends with an oracle** (forked context) reviewing correctness of the whole increment against the ADRs/specs — not just per-story compliance. Set 2026-08-27 during context-switching phase-4 build.

<!-- 2026-08-27 16:55:04 [01a044ee] -->
<!-- 2026-08-27 17:18:38 [01a04505] -->
<!-- pi-subagents model pins + reviewer gate, 2026-08-27 -->
## pi-subagents: bare model ids break, and the reviewer needed bash #lesson #decision

**Resolved the "worker agent is broken" mystery** (earlier notes blamed a missing model — wrong).
`gpt-5.6-sol` exists in the registry under **9 providers** (openai, openai-codex, azure-openai-responses,
amazon-bedrock, cloudflare-ai-gateway, github-copilot, opencode, openrouter, vercel-ai-gateway).
`resolveBaseModelCandidate` (`pi-subagents/src/runs/shared/model-fallback.ts:100-138`) resolves a bare id
only if the session's own provider matches one of them, or exactly one candidate exists. From an
`anthropic` session, 9 non-anthropic candidates → `undefined` → the misleading throw
`Unknown subagent model '<id>' in the active Pi model registry`. Documented behaviour: `docs/models.md:142`.
Bare `claude-*` pins worked only because the session provider is `anthropic`.

**`fallbackModels` never rescues a bad primary.** `buildModelCandidates` (same file, ~:277-295) uses the
*throwing* resolver for index 0 and the warn-and-skip resolver for fallbacks. A mispinned primary dies at
candidate-construction time, before any provider call. `docs/agents.md:202` listing "unavailable model" as a
fallback trigger means runtime failures only.

**Rule: always write model pins as `provider/id`** — in `~/.pi/agent/settings.json`, in `ai/agents/*.md`
frontmatter (`model` *and* `fallbackModels`), and in `my-stuff/setup.sh` (the `subagent_pins` JSON there
re-seeds settings and had silently re-broken worker; fixed + commented).

**`worker` runs with thinking `off` despite `thinking: high`** — it has `defaultContext: fork`, and forking an
Anthropic parent's signed thinking blocks into an OpenAI model drops reasoning. `design-worker` (same model,
fresh context) keeps `high`. Mechanism inferred, not traced.

**reviewer now has `bash`** (`ai/agents/reviewer.md`): the build-loop protocol requires the reviewer to re-run
verify itself, which was impossible with `read, grep, find, ls`. Added `bash` plus `completionGuard: false`
(`docs/agents.md:287` — bash makes an agent mutation-capable and it would otherwise be judged an
implementation agent) and `acceptanceRole: read-only` (`docs/tool-reference.md:290`). Prompt now says: re-run
verify yourself, never accept a pasted result, bash is observation-only, name mutating commands for the
supervisor. Verified: 6 bash calls, zero mutations, acceptance inferred `read-only/reviewer-style agent`.
Tradeoff accepted — reviewer is read-only by instruction now, not structurally.

**`design-worker` still cannot run**: it requests `get_design_context`/`get_screenshot`, but `tools` is a strict
allowlist that does not load extension code. Needs `subagentOnlyExtensions` pointing at
`~/.pi/agent/git/github.com/shopify-playground/pi-figma-mcp/index.ts`. Not yet fixed.


<!-- 2026-08-27 20:40:32 [01a044ee] -->
<!-- reviewer cannot persist artifacts, 2026-08-27 -->
## `reviewer` has bash but no write — orchestrator must persist review artifacts #lesson #pi

Supersedes nothing about `bash`: reviewer gained `bash` + `acceptanceRole: read-only` + `completionGuard: false` on 2026-08-27 17:16. It still has **no `write`/`edit` tool**, and it treats read-only as winning over any instruction to save a file.

Briefing a reviewer to "write findings to `<path>`" produces compliance-with-the-ban instead: it returns the artifact verbatim with a note like *"Review-only role: I could not write … no-edit wins over artifact-writing. The full review artifact is returned … for the runtime to persist."* Correct behaviour, but the file never appears.

**Consequence for workflowScript:** `runs.run(...).output` is the only copy. `status.json` does not retain full child transcripts, so a review not captured from the return value is unrecoverable after the run. When review records must persist, write `.output` from the script or the parent — do not ask the child to.


<!-- 2026-08-31 11:04:29 [01a0584f] -->
## Subagents die with "No API key found for anthropic" — it is never /login (2026-08-31) #lesson #pi #subagents

`auth.json = {}` and no `ANTHROPIC_API_KEY` is the **correct** state on this machine. Auth comes from
two things, both outside pi's own auth store:
1. env credential exported by the tec/`dev` shell activation — `PI_PROXY_API_KEY` / `PI_PROXY_AUTH_HEADER`
   (short-lived, ~18h; the token embeds an `expiry`), and
2. the nix-managed **`shopify-proxy` extension** at `~/.pi/agent/extensions/shopify-proxy ->
   /nix/store/<hash>-pi/config/extension`, which at activation calls `pi.registerProvider("anthropic", {
   baseUrl: "https://proxy.shopify.ai/apis/anthropic", apiKey: "$PI_PROXY_API_KEY" })` plus openai/google/
   groq/xai/fireworks variants. Pi core knows nothing about `PI_PROXY_*`.

So **any child pi process that does not load that extension talks to real api.anthropic.com and dies with
"No API key found for anthropic. Use /login…"**. Verified reproductions of that exact message:
`pi -p --no-extensions …` and `env -u PI_PROXY_API_KEY pi -p …`. Running `/login` would be actively wrong
(stores a personal vendor key and bypasses the proxy).

Three ways a subagent loses the proxy:
- **Agent frontmatter `extensions:`** — pi-subagents sets `disableAmbientExtensions = denyExtensions === true
  || input.extensions !== undefined`, which passes `--no-extensions` to the child (`src/runs/shared/pi-args.ts`).
  Declaring `extensions:` to grant one extension therefore silently kills the proxy. Use
  **`subagentOnlyExtensions:`** instead — it adds `-e` paths without disabling ambient discovery.
- **`capabilityCeiling.denyExtensions`** — same effect.
- **Stale nix symlink**: a *dangling* symlink in `~/.pi/agent/extensions/` is **silently skipped** (verified),
  while an extension that *throws* is fatal with a clear "Failed to load extension" message. A long-lived pi
  session keeps working after the store path is GC'd (providers already registered in memory) while **every
  newly spawned child fails** — parent healthy, 100% of subagents dead, misleading /login advice.
  This is exactly what hit the 2026-08-31 10:47 `delegate` run (meta showed `disableAmbientExtensions: false`,
  model `anthropic/claude-opus-5`, exit 1); the toolchain re-activation at 10:53 repointed the symlink and
  subagents worked again on the next test.

Triage order when a child dies at spawn: (1) `ls -l ~/.pi/agent/extensions/` — is `shopify-proxy` a live
symlink? (2) `echo ${PI_PROXY_API_KEY:+set}` in the parent's env; (3) `cat <artifacts>/<run>_meta.json` →
`launchResolvedExtensions.disableAmbientExtensions`; (4) `pi -p --no-tools --model anthropic/claude-opus-5
'Reply OK'` from a fresh shell as the isolated control. Fix is re-activating the toolchain shell / restarting
pi, never `/login`.

**Never conclude "credential expired" while the parent is still completing calls** — parent-healthy plus
children-dead is diagnostic of load-time extension loss, not auth. (First hit 2026-08-29; David's diagnosis
beat mine, which wrongly blamed the credential.)

Corollary: children inherit the parent's env snapshot, so a pi session left running past the credential's
`expiry` will start failing with 401s (not "no API key") until pi is restarted in a freshly activated shell.


<!-- 2026-09-01 13:25:58 [01a05dee] -->

<!-- gs submit false-alarm under Gitstream mirror mode, 2026-09-01 -->
## `gs submit --force-with-lease` can push successfully and *then* report a false "remote moved" halt #lesson #gitstream #gs

Symptom (2026-09-01, PR #2022969 after a rebase): `gs submit --force-with-lease` halted with
"remote branch origin/<branch> moved from planned submit head <NEW local sha> to <OLD sha> during
submit; run `gs abort` and rerun". Then plain `git push --force-with-lease ... HEAD:refs/heads/<branch>`
said **"Everything up-to-date"** — which looks like the push never happened, because `git ls-remote origin`
still showed the OLD sha.

Cause: this checkout is in **Gitstream mirror mode** (`dev gitstream info`): `origin` *fetches* from
GitHub but *pushes* to gitstream.shopify.io. The push to Gitstream landed; gs then re-read the tip
from the **stale GitHub mirror** and mistook mirror lag for a concurrent remote update. `git ls-remote
origin` reads GitHub too, so it agrees with the stale view. The subsequent plain push was correctly a
no-op because Gitstream already had the new sha.

Settle it with the mirror engine, not with `ls-remote`:
`dev gitstream push-status <branch>` → `outcome: mirrored`, `old_sha` → `new_sha`, `lease_requested: true`.
That is authoritative. Then confirm the PR object: `gs pr view <N>` head sha.

**Do not** re-push, `gs get --force`, or reset the branch on the strength of `ls-remote` alone — you
risk clobbering a push that already succeeded. Also note World checkouts fetch only
`+refs/heads/main:refs/remotes/origin/main`, so `origin/<feature-branch>` legitimately does not
resolve locally; that absence is not a symptom.

Related: `devx ci run` with no args failed with "Cannot trigger CI on main or release branches" on a
feature branch in this state — `devx ci run --pr <N> --no-local-checks` worked.

<!-- 2026-09-01 refine-memory (approved audit 2026-09-01) -->
<!-- drained from ~/plans/stripe-express-ready-metrics/2026-08-18-country-code-queries.md -->
## BigQuery: `monorail_merchant_checkout_diagnostics_1` quirks (2026-08-18)

`sdp-ingest.monorail.monorail_merchant_checkout_diagnostics_1`:

- **No `_PARTITIONTIME` column.** Filter on `DATE(event_timestamp)` or the query scans the whole table.
- **`payload.countryCode` is a required schema field**, so "missing" means the empty string, not `NULL`.
  Absence checks must test `IS NULL OR = ''` — testing `IS NULL` alone silently returns zero rows.
