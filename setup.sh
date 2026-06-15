#!/bin/bash

# David Zhang's Complete Development Environment Setup
# This script installs packages AND configures preferences
#
# Usage:
#   ./setup.sh          Install and configure everything
#   ./setup.sh export   Export current Lasso config back to repo

set -e  # Exit on any error

# Auto-detect the repo directory
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if we're in the right directory
if [ ! -f "$REPO_DIR/Brewfile" ]; then
    echo "❌ Error: Cannot find Brewfile in $REPO_DIR"
    exit 1
fi

# Prompt for a yes/no answer, defaulting to yes. Returns 0 (yes) on empty input,
# "y" or "yes". Non-interactive runs (no TTY / EOF) default to yes.
confirm() {
    local reply
    read -r -p "$1 [Y/n] " reply || reply="y"
    case "${reply:-y}" in
        [Yy]|[Yy][Ee][Ss]) return 0 ;;
        *) return 1 ;;
    esac
}

export_lasso() {
    echo "🪟 Exporting Lasso configuration to repo..."

    if [ ! -f "$HOME/Library/Preferences/com.heavylightapps.lasso.plist" ]; then
        echo "❌ Lasso preferences not found. Make sure Lasso is installed and configured."
        exit 1
    fi

    mkdir -p "$REPO_DIR/preferences/lasso/Application Support"

    echo "📋 Copying Lasso preferences..."
    cp "$HOME/Library/Preferences/com.heavylightapps.lasso.plist" "$REPO_DIR/preferences/lasso/"

    echo "📁 Copying Lasso application support files..."
    cp -r "$HOME/Library/Application Support/Lasso/"* "$REPO_DIR/preferences/lasso/Application Support/" 2>/dev/null || true

    echo "✅ Lasso configuration exported!"
    echo "💡 Don't forget to commit these changes to git."
}

export_vscode_extensions() {
    echo "💻 Exporting VS Code extensions to repo..."
    if ! command -v code &> /dev/null; then
        echo "❌ VS Code CLI (code) not found."
        exit 1
    fi
    code --list-extensions | sort > "$REPO_DIR/preferences/vscode/extensions.txt"
    echo "✅ VS Code extensions exported!"
    echo "💡 Don't forget to commit these changes to git."
}

if [ "${1}" = "export" ]; then
    export_lasso
    export_vscode_extensions
    exit 0
fi

echo "🚀 David's Complete Development Environment Setup"
echo "================================================"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "✅ Homebrew already installed"
fi

# Install packages from Brewfile
echo ""
echo "📦 Installing packages from Brewfile..."
echo "   This may take a few minutes..."
brew bundle --file=./Brewfile

# Install Claude Code (optional, via Homebrew cask)
echo ""
if confirm "🤖 Install Claude Code?"; then
    brew install --cask claude-code
else
    echo "⏭️  Skipping Claude Code"
fi

# Install optional GUI apps
echo ""
if confirm "🖥️  Install GUI apps (VS Code, Docker, Slack, Chrome, Alfred, Lasso)?"; then
    brew bundle --file="$REPO_DIR/Brewfile.apps"
else
    echo "⏭️  Skipping GUI apps"
fi

# Set default shell to Homebrew bash (macOS defaults to zsh)
BREW_BASH="/opt/homebrew/bin/bash"
if [ "$SHELL" != "$BREW_BASH" ]; then
    if [ -x "$BREW_BASH" ]; then
        if ! grep -qF "$BREW_BASH" /etc/shells; then
            echo "🐚 Adding Homebrew bash to /etc/shells (requires sudo)..."
            echo "$BREW_BASH" | sudo tee -a /etc/shells > /dev/null
        fi
        echo "🐚 Switching default shell to Homebrew bash..."
        chsh -s "$BREW_BASH"
    else
        echo "⚠️  Homebrew bash not found at $BREW_BASH. Skipping shell switch."
    fi
else
    echo "✅ Default shell is already Homebrew bash"
fi

echo ""
echo "⚙️  Configuring development environment..."

# Install fonts
echo "🔤 Installing fonts..."
cp "$REPO_DIR/fonts/"*.otf "$HOME/Library/Fonts/" 2>/dev/null || true

# Vim key repeat settings
echo "⌨️  Configuring vim key repeat settings..."
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 10
defaults write -g KeyRepeat -int 1

# Bash profile setup
echo "🐚 Setting up bash profile..."
ln -sf $REPO_DIR/preferences/bash/profile ~/.bash_profile

# Git configuration
echo "📝 Setting up git configuration..."
ln -sf $REPO_DIR/preferences/git/prompt.sh ~/.git-prompt.sh
ln -sf $REPO_DIR/preferences/git/autocomplete.bash ~/.git-autocomplete.bash
ln -sf $REPO_DIR/preferences/git/ignore ~/.gitignore
ln -sf $REPO_DIR/preferences/git/config ~/.gitconfig

# VS Code setup
echo "💻 Setting up VS Code preferences..."
mkdir -p "$HOME/Library/Application Support/Code/User"
ln -sf $REPO_DIR/preferences/vscode/settings.json "$HOME/Library/Application Support/Code/User/settings.json"
ln -sf $REPO_DIR/preferences/vscode/keybindings.json "$HOME/Library/Application Support/Code/User/keybindings.json"

# VS Code extensions (read from file so it's easy to keep in sync)
if command -v code &> /dev/null; then
    echo "📦 Installing VS Code extensions..."
    while IFS= read -r ext; do
        [ -z "$ext" ] && continue
        code --install-extension "$ext" --force 2>/dev/null || echo "   ⚠️  Failed to install $ext"
    done < "$REPO_DIR/preferences/vscode/extensions.txt"
else
    echo "⚠️  VS Code CLI (code) not found. Skipping extension installation."
    echo "   Open VS Code > Command Palette > 'Shell Command: Install code command'"
    echo "   Then re-run ./setup.sh to install extensions."
fi

# Claude Code setup
echo "🤖 Setting up Claude Code preferences..."
mkdir -p "$HOME/.claude"
ln -sf "$REPO_DIR/ai/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
ln -sf "$REPO_DIR/ai/statusline-command.sh" "$HOME/.claude/statusline-command.sh"

# Ensure settings.json has the statusline command configured
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
STATUSLINE_JSON='{"statusLine":{"type":"command","command":"bash ~/.claude/statusline-command.sh"}}'
if [ -f "$CLAUDE_SETTINGS" ]; then
    # Merge statusline config into existing settings
    jq -s '.[0] * .[1]' "$CLAUDE_SETTINGS" <(echo "$STATUSLINE_JSON") > "${CLAUDE_SETTINGS}.tmp" \
        && mv "${CLAUDE_SETTINGS}.tmp" "$CLAUDE_SETTINGS"
else
    echo "$STATUSLINE_JSON" | jq . > "$CLAUDE_SETTINGS"
fi

# iTerm2 setup
# The committed prefs use the placeholder __ITERM_WORKING_DIR__ for the directory
# new windows/tabs open in. We generate a user-specific copy (with the placeholder
# resolved) outside the repo so the repo stays clean and portable across users.
# Split panes keep "reuse previous directory" — that's unaffected here.
echo "🖥️  Setting up iTerm2 preferences..."
read -r -p "   iTerm working directory under \$HOME (blank = home): " ITERM_SUBDIR || ITERM_SUBDIR=""
if [ -z "$ITERM_SUBDIR" ]; then
    ITERM_DIR="$HOME"
else
    ITERM_DIR="$HOME/$ITERM_SUBDIR"
fi
echo "   New iTerm windows/tabs will open in: $ITERM_DIR"

ITERM_PREFS_DIR="$HOME/.config/iterm"
mkdir -p "$ITERM_PREFS_DIR"
cp "$REPO_DIR/preferences/iterm/"* "$ITERM_PREFS_DIR/"
# Resolve the placeholder in the generated copy (| as sed delimiter to avoid / clashes).
for f in "$ITERM_PREFS_DIR/"*; do
    sed -i '' "s|__ITERM_WORKING_DIR__|$ITERM_DIR|g" "$f"
done
defaults write com.googlecode.iterm2 PrefsCustomFolder -string "$ITERM_PREFS_DIR"
defaults write com.googlecode.iterm2 LoadPrefsFromCustomFolder -bool true

# Lasso setup (optional)
# Note: the plist must be copied (macOS preferences system ignores symlinks).
# Application Support files are symlinked so changes sync automatically.
echo ""
if confirm "🪟 Set up Lasso window-management config?"; then
    mkdir -p "$HOME/Library/Application Support/Lasso"
    cp "$REPO_DIR/preferences/lasso/com.heavylightapps.lasso.plist" "$HOME/Library/Preferences/"
    for f in "$REPO_DIR/preferences/lasso/Application Support/"*; do
        ln -sf "$f" "$HOME/Library/Application Support/Lasso/$(basename "$f")"
    done
else
    echo "⏭️  Skipping Lasso config"
fi

# Apply git global settings
echo "🔧 Applying git global configuration..."
git config --global core.excludesfile ~/.gitignore

# Source the new bash profile
echo "🔄 Sourcing new bash profile..."
source ~/.bash_profile

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart your terminal or run: source ~/.bash_profile"
echo "   2. Launch Lasso to activate your window management shortcuts"
echo ""
echo "💡 To export Lasso config changes back to this repo, run:"
echo "   ./setup.sh export"
echo ""
echo "✨ Your development environment is ready!"
