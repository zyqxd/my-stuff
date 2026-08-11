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
