# bin

Personal scripts. `preferences/bash/profile` puts this directory on `$PATH`, so
every `git-*` file is callable as a git subcommand (`git up`, `git wt`, ...).
All scripts are generic — repo- or Shopify-specific values go in git config or
shell aliases, never in the scripts.

## Daily git helpers

| Command | What it does |
|---|---|
| `git up [branch]` | Update main with a single-ref, no-tags fetch; fast-forwards if checked out here |
| `git grab <branch>` | Fetch one remote branch and switch to it (no wide refspec needed) |
| `git wt <branch> [name]` | Same, but into a new worktree; layout from `monorepo.wtroot`/`monorepo.wtsub` |

## Monorepo hygiene

Both are **dry-run by default**; pass `-y` to apply. See `--help` for flags.

- `git monorepo-slim` — one-time surgery for a clone whose ref store is polluted
  with branches that are not yours. Backs up all refs, narrows the fetch refspec
  to main, stops fetching tags, batch-deletes foreign local branches and
  remote-tracking refs. This is what turns hours-long fetches into seconds.
- `git monorepo-cleanup` — weekly: removes worktrees and deletes branches whose
  PR merged (merged or gone upstream), prunes dead remote-tracking refs, runs
  incremental maintenance. Never touches dirty/locked worktrees or protected
  branches. Deletions are SHA-logged to `<git-dir>/cleanup.log`; recover with
  `git branch rescue <sha>` within the gc grace period (~2 weeks).

## World (shop/world) setup

One-time:

```bash
cd ~/world/trees/root/src

# 1. Slim the ref store (~190k foreign branches). Dry run, review, then apply.
#    --keep protects unpushed local work that has no branch.* config; review
#    delete-heads.txt in the plan dir and extend the regex before applying.
git monorepo-slim --keep '^(zyqxd/|backup/|ow-|tophat/|hd40/|ach-|b2m|5024-|reactivation|split-stripe|stripe-express|river-express)'
git monorepo-slim -y --keep '<same regex>'

# 2. Teach `git wt` the World tree layout (~/world/trees/<name>/src)
git config monorepo.wtroot ~/world/trees
git config monorepo.wtsub src
```

Weekly (`world-clean` alias in `preferences/bash/profile`):

```bash
world-clean      # dry run — review the report
world-clean -y   # apply
```

Notes:
- `--force-gone` is in the alias because World squash-merges PRs, so merged
  branches are never ancestors of main; a gone upstream is the merge signal.
- Do **not** run `git gc --prune=now` or `git maintenance start` on World —
  `dev` already registers background maintenance (geometric strategy).
- If `dev` ever rewrites `remote.origin.fetch` back to `+refs/heads/*`,
  re-run `git monorepo-slim -y` (it's idempotent).
