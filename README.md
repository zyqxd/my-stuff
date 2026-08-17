My Personal Tools and Settings for Development and stuff

## New Machine Setup

On a fresh Mac, you need two things before you can clone this repo and run `setup.sh`:
git (via Xcode Command Line Tools) and an SSH key for GitHub.

### 1. Install Xcode Command Line Tools

This gives you `git` and other build essentials.

```bash
xcode-select --install
```

Follow the prompt to install. This can take a few minutes.

### 2. Set up GitHub SSH key

Generate a new SSH key and copy it to your clipboard:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
pbcopy < ~/.ssh/id_ed25519.pub
```

Then add it to GitHub: **GitHub.com > Settings > SSH and GPG keys > New SSH key** and paste.

Verify it works:

```bash
ssh -T git@github.com
```

### 3. Clone and run setup

```bash
mkdir -p ~/Workspace && cd ~/Workspace
git clone git@github.com:zyqxd/my-stuff.git
cd my-stuff
./setup.sh
```

`setup.sh` handles everything else:
- Installs Homebrew (if needed)
- Installs core CLI tools via `Brewfile` (git, node, postgres, fzf, bat, eza, iTerm2, etc.)
- Switches default shell to Homebrew bash
- Symlinks bash profile, git config, VS Code settings
- Configures fonts and keyboard repeat settings (key-repeat speed-up; requires a logout to take effect)
- Generates a user-specific iTerm2 prefs copy and prompts for the working directory new tabs open in
- Sets up shared Claude Code and pi agent rules
- Symlinks local Agent Skills from `skills/` into both agents' global skill directories
- Installs the pi package set and `qmd` (see [Agent tooling](#agent-tooling))

It also prompts (default yes) before these optional steps:
- **Claude Code** — installed via the Homebrew `claude-code` cask
- **GUI apps** — `Brewfile.apps`: VS Code, Docker, Slack, Chrome, Alfred, Lasso
- **Lasso config** — window-management preferences

## Agent tooling

Run the agent portion on its own with:

```bash
./setup.sh agents
```

It is idempotent — safe to re-run any time. On a personal machine the
Shopify-only steps skip themselves.

**Installs:** `pi` and `brain` (via Shopify `dev tools install`), then these pi
packages:

| Package | Purpose |
|---|---|
| `npm:bigpowers` | Skill lifecycle suite |
| `npm:pi-memory` | Persistent memory + search |
| `npm:@sentiolabs/pi-frontend-design` | Frontend design skill |
| `git:Shopify/pi-tool-gateway-extension` | Vault / GitHub / Slack access |
| `shopify-playground/shop-pi-fy` | Shopify pi extras |

The brain client registers itself separately via `brain pi install`.

### qmd

`pi-memory` stores memory as plain markdown, but **every** `memory_search` mode
— `keyword`, `semantic`, and `deep` — needs [qmd](https://github.com/tobi/qmd).
Without it the other memory tools still work; search returns install
instructions instead of results.

qmd is not on Homebrew, and Shopify's toolchain blocks global `npm`/`npx`, so
`install_qmd()` in `setup.sh` goes through pnpm and works around four things
that each silently break the install:

1. pnpm 10+ refuses to run native build scripts without an allowlist.
2. That allowlist must live in pnpm's *global* `package.json` (located via
   `pnpm root -g`, since the `global/<n>` segment shifts between pnpm majors).
3. `better-sqlite3`'s `prebuild-install` exits 0 while producing no binary on
   Node 24, so its own `|| node-gyp rebuild` fallback never fires — the script
   checks for the `.node` file and rebuilds by hand.
4. pnpm's global shim resolves its payload from `dirname($0)`, so it cannot be
   symlinked. A wrapper goes in `~/.local/bin` (already on PATH via the bash
   profile) rather than editing shell rc files, which the Shopify `tec` agent owns.

Check the result from inside pi with `memory_status`, or from a shell:

```bash
qmd collection list   # expect a `pi-memory` collection
```
