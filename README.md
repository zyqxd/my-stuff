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
- Sets up Claude Code agent rules and statusline, and shares the same agent rules with the pi agent (`~/.pi/agent/CLAUDE.md`)

It also prompts (default yes) before these optional steps:
- **Claude Code** — installed via the Homebrew `claude-code` cask
- **GUI apps** — `Brewfile.apps`: VS Code, Docker, Slack, Chrome, Alfred, Lasso
- **Lasso config** — window-management preferences
