# Agent contract and memory

`AGENTS.md` holds shared behavior. This reference owns installation, memory, and state procedures.
For Pi delegation, use `agents/README.md`.

## Install or check links

Requires Node.js. Run from any directory:

```sh
node /path/to/my-stuff/ai/install-agent-links.mjs          # check only
node /path/to/my-stuff/ai/install-agent-links.mjs --apply  # create missing links
```

Exit codes: **0** all links match, **1** links are missing, **2** invalid configuration,
collision, or execution error. The standalone installer does not install packages or edit settings.

Apply checks all sources, destinations, and ancestors before creating links. It refuses
real-file, foreign/dangling-link, overlapping-path, and global-instruction collisions.
Existing matching links and unmanaged siblings remain unchanged. Unresolved case-only
path collisions are rejected on every platform. Preflight is not a transaction or lock:
recheck after a filesystem error. There is no force-overwrite option.

Both `./setup.sh` and `./setup.sh agents` use this installer. Full setup installs Node
through Brewfile first; agents-only requires Node. Both reject client-directory overrides
because their other package/settings steps use default locations. Use the standalone
installer for custom directories.

### Owned links

| Destination | Source in this repository |
|---|---|
| `~/.claude/CLAUDE.md` | `ai/AGENTS.md` |
| `~/.codex/AGENTS.md` | `ai/AGENTS.md` |
| `~/.pi/agent/CLAUDE.md` | `ai/AGENTS.md` |
| `~/.pi/agent/memory` | `ai/memory/` |
| `~/.pi/agent/agents` | `ai/agents/` |
| each client's `skills/<name>` | `ai/skills/<name>/` containing `SKILL.md` |
| `~/.pi/agent/extensions/<entry>` | `ai/extensions/<entry>` file or directory containing `index.ts` |
| `~/.claude/statusline-command.sh` | `ai/statusline-command.sh` |

README-only skill directories are reported, not installed. Unknown local skills,
third-party packages, native memory, and team banks are not adopted or modified.
Resolve ownership before replacing a conflicting path.

### Directory overrides

`HOME` is required. All values must be absolute and non-empty. Expand `~` in the shell.
Client roots can be symlinks. Sources resolve from the installer's own location.

| Variable | Controls | Default |
|---|---|---|
| `CLAUDE_CONFIG_DIR` | Claude links | `$HOME/.claude` |
| `CODEX_HOME` | Codex links | `$HOME/.codex` |
| `PI_CODING_AGENT_DIR` | Pi instructions, roles, skills, extensions | `$HOME/.pi/agent` |
| `PI_MEMORY_DIR` | Pi-memory store, independently of Pi's agent directory | `$HOME/.pi/agent/memory` |

## What loads

| Harness | Behavior |
|---|---|
| Claude Code | Reads `CLAUDE.md`, including symlinks. User/project/local files concatenate. |
| Codex | Selects the first non-empty global `AGENTS.override.md`, then `AGENTS.md`. Project discovery selects one file per directory, root→cwd. Closer instructions take precedence. Default project document budget: 32 KiB. |
| Pi 0.84.3 | Selects the first readable `AGENTS.override.md`, `AGENTS.md`, `AGENTS.MD`, `CLAUDE.md`, or `CLAUDE.MD`, including empty files. Loads global and ancestor context. |
| Pi children | Need both `inheritProjectContext: true` and `inheritGlobalContext: true`. All five roles set both; global inheritance otherwise defaults false. |

The checker covers global link destinations, not nested instructions, managed policies,
client settings/flags, plugins, or model adherence. Higher-priority aliases to the same
contract are accepted. Other global shadowing is an error. Codex's configured
`CLAUDE.md` fallback is not required by this setup.

Start a new session after instruction or role edits. Reload Pi parents after package
changes. Plain references are for targeted reading, not cross-client `@imports`.

## Memory and state procedures

| Location | Purpose |
|---|---|
| `lessons/<scope>.md` | Scoped engineering lessons; `archive/` retains retired history |
| `memory/MEMORY.md` | Durable facts; full entries need targeted retrieval |
| `memory/daily/`, `memory/SCRATCHPAD.md` | Historical exhaust and explicit writes, not unit state |
| `memory/recovery/` | Recovery records for explicit forget/restore operations; never pruned by installation |
| `memory/drain-state.json` | Existing curation watermark; retained |
| `brain/CLAUDE.md` | Authored personal Brain rules; guarded regular-file copy in the personal bank |
| `install-memory-integrations.mjs`, `patches/` | Reproducible Pi memory/Brain package pins |
| `agents/` | Pi roles, routing, and runtime tests |
| `tests/`, `evals/` | Delivery checks and behavioral scenarios |
| `~/plans/` | Managed unit state and optional reports/handoff evidence in the Brain personal bank |

The pinned pi-memory is retrieval-only in every Pi session: no ambient snapshots,
startup indexing/embedding, exit recaps, or precompaction diary copies. Explicit
read/search/write, scratchpad, forget/restore and status tools retain upstream behavior,
including qmd setup/indexing after explicit use. Store content and recovery records stay
under `ai/memory/` through the existing link; nothing is pruned or migrated.

Brain supplies bank/rules paths, identity fields when present, and prompt-triggered
knowledge. Read applicable bank rules before work that depends on them; retrieved rules
cannot expand the approved task. DailyContext updates require David's explicit diary
request; project docs require a documentation request. A status check, project creation,
context switch or session ending is not a diary request. activeProjects stays frozen.
Managed unit STATE remains the current-state owner; the impact ledger stays retired.

Claude's native auto memory and Codex's optional memories are separate recall stores,
not the canonical files above. This setup neither migrates nor disables them.

### Unit handoffs and reports

A unit capsule is `~/plans/<project>/<unit>/`: managed STATE head, log tail, and `inbox/`.
The separate context-switching extension (`~/Workspace/context-switching`) owns head
rewrites. Its four-line STATE is an orientation summary, not a complete handoff; Pi
session history and subagent runtime records retain execution detail.
Read its head at session start for orientation, then recheck live facts before acting.
When the managed updater is unavailable, disclose that STATE was not refreshed. Do not
hand-edit it or create a report just to compensate for stale state.

Plans and results stay in chat by default; temporary runtime artifacts are fine. Save a
durable report only when requested, required by an applicable workflow, or needed for a
genuine handoff. Use the existing unit's `inbox/` for such extracts, not competing status
snapshots. If a durable destination is needed but unknown, ask. Use the real system date
and `~/plans/README.md` → **Report naming** for filenames. Its legacy todo-retrieval
advice does not govern current state.

### Lessons and curation

When recording a correction, preserve the failure or preference, rationale, future action,
scope, evidence, and uncertainty. Ask for missing boundaries rather than inventing them.
Keep behavior in the contract, scoped guidance in lessons, and retrievable facts in memory.
When promoting a rule, retain provenance rather than another copy of its instructions.
A correction does not authorize unrelated memory cleanup.

## Pi memory/Brain package pins

Installation is explicit and must run from the approved canonical checkout, not a feature
worktree. Requires Node, `patch`, stock pi-memory **0.4.2** and the reviewed Brain Pi
**2.1.0** toolchain tree. No installer calls a model, Brain lifecycle command, or network.
If stock pi-memory is missing on first setup, install `npm:pi-memory@0.4.2` with Pi first;
`setup.sh` does this and selects the pins instead of re-registering stock Brain/memory.

```sh
node ai/install-memory-integrations.mjs                 # doctor; no writes
node ai/install-memory-integrations.mjs --prepare-only  # independent local copies; no settings change
node ai/install-memory-integrations.mjs --apply         # select verified copies
# Add --only pi-memory or --only brain for a single package.
```

`PI_CODING_AGENT_DIR` can select a different absolute agent directory; Brain's source
still comes from the activated user toolchain. The installer verifies entire package
content trees (excluding node_modules), copies resolved sources to independent staging,
applies versioned patches, and verifies the results. Both packages use only Pi-provided
runtime imports; no npm peer copies are carried into the pins. Existing targets are
never overwritten. Settings retain unrelated packages, provider/subagent configuration,
and package resource filters. Failures exit 1; success exits 0. Keep other settings
writers stopped during application; the pre-write comparison is not a filesystem lock.

Selected sources, relative to Pi's agent directory:
- `local-packages/pi-memory-0.4.2-retrieval-only`
- `local-packages/brain-pi-2.1.0-targeted-context`

Each copy records its resolved origin and content hashes in `.integration-origin.json`.
Brain's origin records the Nix store path. Doctor fails on toolchain-origin or content
drift, local modifications, and duplicate original/pinned registrations (including direct
extension entries). Do not run `brain pi install` while pinned: it adds the stock path
back and may double-load Brain. After an upgrade, review the source changes and update
patches/hashes/tests before replacing a pin. Pi package updates do not advance these copies.
Doctor checks the selected agent settings, not every project's settings; check project
package/extension entries too before deployment.

Pi no longer runs `brain session start/end`: it does not automatically archive diaries,
sync banks, rebuild the trigger cache, or submit changes. Manual Brain commands retain
their existing behavior and permission requirements; CLI `auto_submit` is unchanged.
After knowledge changes, explicitly run `brain knowledge build-cache` when appropriate.
Missing/malformed caches retain the last good in-process snapshot and report a warning;
a fresh process with no cache needs an explicit rebuild for targeted knowledge.

### Personal rules adoption

`ai/brain/CLAUDE.md` owns authored personal rules. Brain deliberately rejects symlinked
rules, so adoption is a guarded regular-file copy, separate from package installation:

```sh
node ai/install-brain-rules.mjs          # compare reviewed preimage; no writes
node ai/install-brain-rules.mjs --apply  # only after personal-bank installation approval
```

The script requires the reviewed preimage SHA-256 (or already-matching managed content),
keeps `CLAUDE.md.before-my-stuff`, and refuses changed bank content or backup collisions.
Future rule edits require reviewing the installed preimage and updating that hash, not
blindly overwriting bank edits. No team-bank content is adopted. To undo adoption, first
verify the installed file still matches `ai/brain/CLAUDE.md`, then restore the preserved
regular-file backup after approval; keep the backup for recovery.

### Verification before accepting installation

Reload parents after package changes. Check a real researcher `session.jsonl`: only the
compact new Brain envelope, no new memory snapshot/recap; global/project contract, skills,
triggered knowledge, brief and evidence must survive. Verify a fork retains parent history
and provider/model/effort. Old persisted Brain/memory context remains in resumed/forked
history deliberately; these pins never rewrite prior messages. Isolated hook tests below
are not a substitute for this approval-gated live child check.

### Rollback, per package

After approval, use Pi's native package selection (preserve any resource filters):

```sh
pi remove "$HOME/.pi/agent/local-packages/pi-memory-0.4.2-retrieval-only"
pi install npm:pi-memory@0.4.2

pi remove "$HOME/.pi/agent/local-packages/brain-pi-2.1.0-targeted-context"
brain pi install
```

Reload afterward. Memory rollback restores automatic context/diary behavior; Brain
rollback selects the **current toolchain release**, restoring its lifecycle subprocesses
and broad startup block. Neither rollback removes memory/recovery/history or the local
pin copies. Rolling back a package does not roll back personal rules. To stay on upstream,
remove the corresponding pin calls from `setup.sh` only after reviewing upstream behavior;
otherwise setup reselects the pin. The separate pi-subagents fix is unaffected.

## Verification

```sh
node --test ai/tests/*.test.mjs ai/agents/tests/routing.test.mjs
# Inside Pi, include installed routing/package checks:
node --test ai/tests/*.test.mjs ai/agents/tests/*.test.mjs
bash -n setup.sh
```

Tests use disposable fixtures. `PI_PACKAGE_DIR` enables actual Pi loading, role resolution,
prompt construction, and child rewriting, including a false-inheritance control. Codex's
offline test checks linked content and override replacement. Unavailable runtimes produce
explicit skips. Existing routing tests require the configured Pi/subagent installation.
Memory integration tests load the actual patched hooks through Pi, exercise all five
resolved role prompts and native fork history, and keep model/CLI test doubles offline.
They need the reviewed stock sources (`MEMORY_PACKAGE_DIR` / `BRAIN_PI_PACKAGE_DIR`
can override installed locations). Personal-rules adoption tests need the reviewed
preimage from the live file, its backup, or `BRAIN_PERSONAL_RULES_PREIMAGE`; unavailable
inputs skip explicitly. These are delivery tests, not live provider/agent-accuracy proof.

Native diagnostics:

```sh
codex debug prompt-input 'Contract delivery check only.'
claude -p /context --tools '' --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --settings '{"disableAllHooks":true}' --no-session-persistence --output-format json
```

Inspect the contract content in Codex's input and its path in Claude's Memory Files.
These diagnostics require no model turns in the verified versions. Stop if another
version requests authentication.

Loading tests prove delivery, not instruction-following. Use `evals/` when a behavioral
change needs evaluation, not as mandatory ceremony for every wording edit. Prompt rules
are not a sandbox. Prior native diagnostics and decision-only probes are recorded in
`~/plans/pi-agent-orchestration/2026-09-07-cross-model-contract-audit.md`.

## Sources

- [Anthropic memory/loading](https://code.claude.com/docs/en/memory) and [prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [memories](https://developers.openai.com/codex/customization/memories), and [OpenAI model guidance](https://developers.openai.com/api/docs/guides/prompt-guidance).
- [Boris Cherny reference supplied by David](https://raw.githubusercontent.com/maximus0411/BorisChernyClaudeMarkdown/refs/heads/main/CLAUDE.md): short imperatives and one idea per rule, not its repo-local task paths.
- Installed Pi loader/system-prompt source, pi-subagents discovery/prompt rewriter, and pi-memory resolver establish runtime behavior. Recheck after upgrades.
