# Lessons — Shell configuration

## Test every history entry point against the requested scope

Source: Atuin Up-arrow correction, 2026-07-31.

- When a user asks for directory-specific shell history, verify explicit history commands, Ctrl-R, and Up independently because integrations can configure each differently.
- Keep Up scoped to the current directory when requested; do not assume a local helper command makes the default key binding local.
- The initial setup left Atuin’s Up binding global despite `dhistory` being local, which the user observed immediately.
- Apply this to shell-history integrations. This correction establishes only Up as local; preserve Ctrl-R’s global scope unless the user requests otherwise.

## World branch lifecycle: develop in worktree, test in root, clean worktree

Source: David's instruction during #6928 tophat prep, 2026-08-05.

"Move our worktree into main" means moving the *branch* into the root tree,
not rebasing onto main. David's standard World lifecycle:

1. **Develop** in a dedicated worktree (`git wt <branch>` →
   `~/world/trees/<name>/src`).
2. **Test locally** in the root tree: verify the dedicated worktree is clean
   and pushed, `git worktree remove ~/world/trees/<name>/src` (frees the
   branch), `rmdir` the empty parent, `git worktree prune`, then
   `git checkout <branch>` in `~/world/trees/root/src` and `dev up --bare`
   in the zone. Local testing (`dev assets`, tophat) happens from root.
3. **Clean** the worktree as part of the move — don't leave stale trees.

- Root may sit on another feature branch with untracked dirs (e.g.
  `areas/tools/go-links/`); untracked files carry over untouched — leave them.
- `git-wt`/`git-grab` in my-stuff/bin cover creation/fetch only; the move-back
  is plain git as above.

## Never put backticks in a double-quoted `git commit -m` message

Source: monet-slack commit ee32d51, 2026-08-18 (self-caught).

Writing `git commit -q -m "... strips mona's `[loop]` diagnostics ..."` inside
double quotes makes bash run `[loop]` as command substitution. The token is
silently deleted from the message (`mona's  stdout diagnostics`) and bash prints
`[loop]: command not found` — easy to miss among push output.

- **Future action:** for any commit message containing backticks, brackets, `$`,
  or `!`, write it with a quoted heredoc (`git commit -F - <<'MSG'`) or a temp
  file. Never rely on double quotes.
- Verify with `git log -1 --format=%B` before pushing, not after.
- Amending is not worth a force-push once pushed; the loss is cosmetic if the
  real content also lives in a doc/ADR — but the check is free beforehand.

## Never pass a literal `~` to a tool path

Source: found 2026-08-28 in the admin-web checkout — a past session had created
`areas/clients/admin-web/~/plans/stripe-express-ready-metrics/` inside the World tree.

Only an interactive shell expands `~`. Tool paths (`write`, `edit`) and quoted
`mkdir -p '~/x'` do not, so the tilde becomes a real directory name. Inside the
monorepo that is an untracked-but-not-ignored folder — a commit hazard, and exactly
the "never write memory into a checkout" failure the constitution bans.

- **Future action:** write `$HOME/...` or the full absolute path in every tool call.
  Reserve bare `~` for text a human will read.
- Verify with `ls -d ~/plans/<x>` (expanded) rather than trusting the write succeeded;
  a write to the wrong place still reports success.

## A stale reftable lock blocks every commit in the repo

Source: 2026-08-24, `~/world/git/reftable/tables.list.lock` — 0 bytes, 38h old,
no holder. Every commit failed with `fatal: cannot lock references`.

Git's reftable backend does not clear a lock left by a crashed process, and the
error names the ref, not the lock, so it reads like repo corruption.

- **Diagnose before deleting:** `lsof` the lock (must show no holder) and confirm
  `tables.list` was last written *before* the lock's ctime. Both must hold.
- Back the lock up (`/tmp/...bak`), remove it, then `git fsck --connectivity-only`.
- Scope: the shared `~/world/git` store, so a stale lock blocks every worktree at
  once — the blast radius is the whole monorepo, not one branch.

## Keep pasteable commands from closing the calling shell

2026-09-15: David reported that my issue-creation snippet closed immediately.
It started with top-level `set -euo pipefail`; a failed command can terminate the
interactive shell and hide its error. The actual GitHub failure was not captured,
so its underlying cause remains unknown. Read-only search found no matching issue
and the draft file was readable.

Prefer separate commands with explicit handled failures for simple pasteable work.
David then reported an unclosed string in the replacement heredoc/nested substitution;
its exact parsing failure was not captured. Removing that wrapper is clearer than
adding more shell machinery. The two direct commands passed Bash and zsh syntax and
mocked failure checks, including caller `set -e` enabled.

For genuinely multi-stage scripts, isolate fail-fast options in a child process and
handle its exit. Preserve stderr and print the issue URL before board addition.
Retry only board addition if creation succeeded. Do not change the user's interactive
shell options.

Evidence: `~/plans/llc-incentive/design-doc/inbox/2026-09-15-main-issue-final-handoff.md`.
Scope: interactive snippets, not a relaxation of script fail-fast or mutation guards.
