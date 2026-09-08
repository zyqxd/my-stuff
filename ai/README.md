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
| `memory/daily/`, `memory/SCRATCHPAD.md` | Unversioned exhaust, not unit state |
| `memory/drain-state.json` | Brain drain watermark |
| `agents/` | Pi roles, routing, and runtime tests |
| `tests/`, `evals/` | Delivery checks and behavioral scenarios |
| `~/plans/` | Reports and unit evidence in the Brain personal bank |

Pi-memory injects bounded snapshots, not complete entries. Use its search/read tools
or plain file tools to retrieve the relevant evidence. Claude's native auto memory and
Codex's optional memories are separate recall stores, not the canonical files above.
This setup neither migrates nor disables them.

### Unit handoffs and reports

A unit capsule is `~/plans/<project>/<unit>/`: managed STATE head, log tail, and `inbox/`.
Read its head at session start for orientation, then recheck live facts before acting.
When the managed updater is unavailable, save evidence in the existing unit's `inbox/`
and disclose that STATE was not refreshed. Ask if the destination is unknown.

Reports are self-contained analysis extracts, not competing status snapshots. Use the
real system date and `~/plans/README.md` → **Report naming** for filenames. Its legacy
todo-retrieval advice does not govern current state.

### Lessons and curation

When recording a correction, preserve the failure or preference, rationale, future action,
scope, evidence, and uncertainty. Ask for missing boundaries rather than inventing them.
Keep behavior in the contract, scoped guidance in lessons, and retrievable facts in memory.
When promoting a rule, retain provenance rather than another copy of its instructions.
A correction does not authorize unrelated memory cleanup.

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

Native diagnostics:

```sh
codex debug prompt-input 'Contract delivery check only.'
claude -p /context --tools '' --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --settings '{"disableAllHooks":true}' --no-session-persistence --output-format json
```

Inspect the contract content in Codex's input and its path in Claude's Memory Files.
These diagnostics require no model turns in the verified versions. Stop if another
version requests authentication. Save evidence in the unit inbox.

Loading tests prove delivery, not instruction-following. Use `evals/` when a behavioral
change needs evaluation, not as mandatory ceremony for every wording edit. Prompt rules
are not a sandbox. Prior native diagnostics and decision-only probes are recorded in
`~/plans/pi-agent-orchestration/2026-09-07-cross-model-contract-audit.md`.

## Sources

- [Anthropic memory/loading](https://code.claude.com/docs/en/memory) and [prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [memories](https://developers.openai.com/codex/customization/memories), and [OpenAI model guidance](https://developers.openai.com/api/docs/guides/prompt-guidance).
- [Boris Cherny reference supplied by David](https://raw.githubusercontent.com/maximus0411/BorisChernyClaudeMarkdown/refs/heads/main/CLAUDE.md): short imperatives and one idea per rule, not its repo-local task paths.
- Installed Pi loader/system-prompt source, pi-subagents discovery/prompt rewriter, and pi-memory resolver establish runtime behavior. Recheck after upgrades.
