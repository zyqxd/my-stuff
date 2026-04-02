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
- Installs all packages and apps via Brewfile (Chrome, iTerm2, Alfred, Lasso, VS Code, Docker, Slack, etc.)
- Installs Claude Code via npm
- Switches default shell to Homebrew bash
- Symlinks bash profile, git config, VS Code settings, iTerm2 preferences
- Configures Lasso window management, fonts, keyboard repeat settings
- Sets up Claude Code agent rules and statusline
