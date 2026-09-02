# Lessons — World git, Graphite, and worktrees

Branch, worktree, Graphite/`gs`, and PR-plumbing lessons for the World monorepo.
Split out of `admin-web.md` on 2026-09-01 — the lesson text is unchanged.
Sibling files: `admin-web.md`, `world-verification.md`, `checkout-metrics.md`.

## Removing a core GraphQL field consumed by admin-web = 3 single-zone PRs

Cross-zone PR restriction forbids one PR touching core + admin-web. Order:
admin-web (stop selecting) → core (remove field + regen `admin_schema_*` dumps) →
admin-web (`refresh-graphql` / resync `protocols/graphql/core.*` + `core-types`).
Reverse schema-dump hunks precisely from the field-add commit; verify against
_current_ content (`.graphql` sorts fields alphabetically, `.json` uses definition order).

## Keep development-only changes off real PR branches

Source: Stripe Express ready-metrics stack, 2026-07-16; the same temporary tophat patch reached real branches twice.

- Before committing or pushing after cherry-picked tophatting, inspect recent commits and the branch diff for `[DO NOT MERGE]` markers or development-only helpers; remove them first.
- Verify the pushed diff contains no development-only files; correct the branch immediately if one escaped.

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

## A blocker must record *why*, or logistics harden into a dependency

**Failure (2026-08-19 → 2026-08-20, #7343 s05).** I finished a small CHF/OMR
currency fix in the root worktree. Mid-task David switched that worktree to
another issue's branch (`reopen-honour-plan-period-7256`), so I moved my two
untracked files out to `~/plans/.../patches/pending-currency-fix/` to keep his
branch clean — correct in the moment. Then I wrote the story up as:

```yaml
blocked_by: 'deferred until #7256 lands (David, 2026-08-19)'
```

That sentence is false in the way that matters. Nothing in the currency fix
needed anything from #7256; the files were parked because a *shared checkout
moved*, which is a fact about my afternoon, not about the code. For a full day
the plan, the epic file, and the daily context all reported a functional
dependency, and the work sat finished-but-unshipped behind two unmerged PRs.
The ordering was also backwards: #7256 was itself queued behind another open
PR, so the branch I was "waiting for" was going to land *after* mine.

**Why it survived a day.** A `blocked_by` line with a date and a name reads as
though someone decided it. Nobody re-derives a blocker that looks adjudicated —
I didn't, until asked "why does this depend on #7256?", and the answer took two
minutes to find in my own log.

**Future action.**

1. Write blockers so they can be falsified: name the artifact and the mechanism
   (`needs the X field added by #NNNN`), never just a date or a branch name. If
   the sentence cannot say what breaks without the other change, it is not a
   dependency — it is sequencing, and sequencing goes in a `notes:` field.
2. Distinguish the three kinds explicitly, because only the first is a blocker:
   **functional** (needs their code), **conflict adjacency** (same lines, so
   whoever is second rebases — costs time, blocks nothing), and **logistics**
   (worktree/branch/machine state — never a property of the work).
3. When a shared worktree moves under an in-flight change, the recovery is a
   *dedicated worktree for that change*, not a patch parked in `~/plans`.
   Parking defers the work; branching preserves it. Never leave finished code
   outside a branch.
4. Re-read every `blocked_by` at session start on that project and ask whether
   the stated cause is still true. Blockers rot silently; nothing fails when
   one is stale.

**Related.** "Verify the branch after `gt checkout`" above — same root cause
(the root worktree is shared state that moves between turns), different
symptom. Keep the root worktree on `main`.

**Scope.** Any planning artifact with a `blocked_by`/`depends_on` field, and any
work parked because of checkout state rather than code.

## Re-assert the branch before every write, not once after checkout

**Failure (2026-08-21, #7256 a11y).** I checked out
`reopen-announce-selection-7256` in the root worktree and asserted the branch
name — correctly, per the earlier `gt checkout` lesson. Some tool calls later
the root worktree was on `6154-signup-shared-emitter` instead (David moved it
while I was working). Every subsequent `git reset --hard` and
`git commit --amend` therefore rewrote **his** branch, walking PR #1008555's
tip off `d14d484c`.

**How it presented, and why I misdiagnosed it.** After the amend I compared the
committed blobs against what I had built and found a file matching *none* of
base, PR head, or my new version. I concluded "`git commit` rewrote the tree",
went looking for a pre-commit hook, found only git-lfs, and burned about eight
tool calls on a theory that could not be true. The "impossible fifth blob" was
simply another branch's copy of the same path. **When git content matches no
expected version, suspect the ref you are standing on before you suspect git.**

**Two things saved it.** The remote was never clobbered — the one bare
`git push` that would have done it was rejected for an unrelated reason — and
`git reflog show <branch>` still had `d14d484c`, so the restore was exact.

**Future action.**

1. Assert the branch *immediately before* every mutating git command in a long
   session — `reset`, `commit`, `amend`, `push` — not once after checkout. A
   shared worktree is mutable state owned by someone else; its branch is only
   true for the tool call that read it.
2. **Never bare `git push`.** With `push.default=matching` it attempts every
   branch whose name exists on the remote, including ones this session damaged.
   Always `git push origin <branch>`, and pair force with
   `--force-with-lease=<branch>:<sha>`.
3. Verify a rewritten commit by **blob hash**, not by the tool's own output:
   `git rev-parse HEAD:<path>` against the hash you intended. Message text and
   "HEAD is now at …" say nothing about content.
4. Before rewriting an existing PR branch, record the old SHA in the transcript
   so the lease has a value and recovery is one command.

**Related.** "Verify the branch after `gt checkout`" above — same root cause,
one step further on: checking once is not enough when the worktree is shared.
The real fix is a dedicated worktree per change.

**Scope.** Any multi-step git work in a shared or root World worktree.

## `gs pr edit` silently publishes a draft PR

**Failure.** Editing PR #2022969's body with `gs pr edit 2022969 --body-file …` returned
`Edited PR #2022969: body` and also flipped `draft` from `true` to `false`. Nothing in the
output mentioned draft state. The PR sat review-ready for as long as it took to notice.

**Second occurrence.** A halted `gs submit` dropped the same flag on #2021720 earlier in
August; that one was blamed on the halt. Two different `gs` paths clearing it makes the flag
the fragile thing, not the command.

**Future action.** After any `gs` write that touches a draft PR — `submit`, `pr edit`,
`pr create` — read the flag back and restore it if lost:

```
gs pr view <N> --json | jq -r '.draft, .x_gitstream.state_extended'
gs api -X PATCH repos/shop/world/pulls/<N> -F draft=true
```

`x_gitstream.state_extended` is the field to trust; it reads `draft` or otherwise.
Do not assume an edit is metadata-only because the command names only the field you passed.

**Scope.** shop/world PRs via `gs`, any zone. #lesson

## `gs submit` can report "1 unchanged" while the remote is stale

**Failure.** After `gs submit` halted during `list` ("remote branch moved from planned
submit head …"), the documented recovery — `gs abort` then rerun `gs submit` — printed
`1 unchanged / #2022969 shimmer-started-7239 unchanged`. The remote ref was still at the
previous commit; the new commit had not been pushed. `gs` had cached the planned head from
the aborted run, so "unchanged" described its own stale metadata, not the remote.

**Second symptom, same session.** `gs pr view <N> --json` returned `null` for `head`,
`commits`, `changed_files`, and `additions` while still reporting `draft`. `gs api
repos/shop/world/pulls/<N>` returned all of it correctly. Do not conclude a PR is broken
from a `gs pr view` null.

**Future action.** Never trust `gs submit`'s summary as proof a push landed. Verify against
the remote directly, and fall back to plain `git push`:

```
git rev-parse HEAD
git ls-remote origin <branch> | awk '{print $1}'   # must match
gs api repos/shop/world/pulls/<N> | jq '.head.sha, .commits, .draft'
```

`git push` through Gitstream prints `git: 'credential-gitstream-auth' is not a git command`
and then `Everything up-to-date`; both are noise if the ls-remote SHA matches.

**Scope.** shop/world via `gs`. #lesson

---

## `gs submit` drags in ancestors; use the plumbing verbs for a stacked PR

`gs submit` submits "the current branch and its unmerged ancestors". On a stacked PR whose parent is
checked out in another worktree it simply refuses:
`gs: branch <parent> is checked out in another worktree`. Worse, if it had proceeded it would push
the parent's ref — dangerous when the parent PR is under active review and being amended by someone
else. Path that touches only your own branch:

```
git ls-remote origin <parent>      # confirm local == remote first, so you aren't racing an amendment
gs push
gs pr create --draft --base <parent> --head <branch> --title … --body-file …
```

`gs pr create` is documented as plumbing: it does not push and maps to one create-PR endpoint.

**Scope.** admin-web / shop/world stacked PRs. #lesson

---

## After a stacked parent merges, re-parent the branch or fastcheck silently checks the wrong files

**Failure (2026-09-01, #7241).** After #7239 merged and I rebased #7241 onto `main`,
`fastcheck branch` failed with a `type-check` error — in
`intent-engine-server/.../banking-home.intent.ts`, a file this PR never touched. Running
`./scripts/fastcheck/type-check.sh` directly "passed", which was a **false pass**: with no
arguments the script derives its file list from `$PPID` via `detect-subcommand.sh`, found
nothing, and hit `[[ -z "$FILES" ]] && exit 0`. It checked zero files and exited 0.

**Root cause.** `scripts/fastcheck/changed-files.sh branch` computes its scope as
`git merge-base HEAD "$(gs stack parent)"`. The branch was still tracked as stacked on
`shimmer-started-7239`, whose local ref pointed at the now-merged `3220c4fc`. That commit is
an ancestor of `main`, but an *old* one, so the diff swept in every commit main had gained
since — 616 files instead of 7 — and one of them crashed the tsconfig resolver.

**Fix.** Re-parent onto trunk, metadata only, no commit rewrite:

```
gs move --onto main --keep
./scripts/fastcheck/changed-files.sh branch | wc -l   # back to the real count
```

**Future action.** When a stacked PR's parent merges, the rebase is only half the job — fix
the stack metadata too, then re-check the scope count before trusting any fastcheck result.
And whenever a fastcheck sub-script "passes" on a direct re-run after failing under
fastcheck, verify it actually examined files; several of these scripts exit 0 on an empty
input set. (Same failure shape as the `oxfmt --check $(git diff --name-only …)` gate that
resolved to zero files from the zone root.)

**Bonus, verified same session:** an `oxlint-suppressions.json` `max-lines` entry records
`"count": 1` — the number of *violations*, not a line budget. Adding lines to an
already-suppressed file keeps one violation and stays covered.

**Scope.** admin-web fastcheck + `gs` stacks. #lesson

## The pre-push hook rejects a stale merge-base, and `--no-verify` is not the answer

Source: 2026-08-24 — push rejected with "HEAD's base with origin/main is about 69
hours old. Rebase before pushing", on a branch with zero merge conflicts.

A clean diff is not the gate; branch-age against `origin/main` is a separate one. The
message reads like a conflict warning, which invites `--no-verify`.

- **Future action:** `git fetch origin main && git rebase origin/main`, then push.
  Never bypass — the hook exists because a stale base makes CI results meaningless.
- **Unknown:** whether this hook is shop/world-wide or admin-web-scoped. Observed once,
  on an admin-web branch. Treat as repo-wide until something contradicts it.
