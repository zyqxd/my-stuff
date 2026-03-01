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

if [ "${1}" = "export" ]; then
    export_lasso
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

echo ""
echo "⚙️  Configuring development environment..."

# Install fonts
echo "🔤 Installing fonts..."
cp "$REPO_DIR/fonts/"*.otf "$HOME/Library/Fonts/" 2>/dev/null || true

# Vim key repeat settings
echo "⌨️  Configuring vim key repeat settings..."
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 20
defaults write -g KeyRepeat -int 2

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

# VS Code extensions
if command -v code &> /dev/null; then
    echo "📦 Installing VS Code extensions..."
    extensions=(
        attilabuti.vscode-mjml
        craigmaslowski.erb
        dnicolson.binary-plist
        eamodio.gitlens
        enochc.copy-relative-path
        esbenp.prettier-vscode
        evgeniypeshkov.syntax-highlighter
        ex-codes.pine-script-syntax-highlighter
        fabiospampinato.vscode-open-in-github
        file-icons.file-icons
        flowtype.flow-for-vscode
        github.copilot
        github.copilot-chat
        golang.go
        hashicorp.terraform
        janisdd.vscode-edit-csv
        kumar-harsh.graphql-for-vscode
        mechatroner.rainbow-csv
        mikestead.dotenv
        ms-azuretools.vscode-docker
        ms-vscode-remote.remote-containers
        rvest.vs-code-prettier-eslint
        shd101wyy.markdown-preview-enhanced
        shopify.ruby-lsp
        sianglim.slim
        t3dotgg.vsc-material-theme-but-i-wont-sue-you
        vitaliymaz.vscode-svg-previewer
        vscodevim.vim
        vsls-contrib.gistfs
        yo1dog.cursor-align
        yzhang.markdown-all-in-one
        zxh404.vscode-proto3
    )
    for ext in "${extensions[@]}"; do
        code --install-extension "$ext" --force 2>/dev/null || echo "   ⚠️  Failed to install $ext"
    done
else
    echo "⚠️  VS Code CLI (code) not found. Skipping extension installation."
    echo "   Open VS Code > Command Palette > 'Shell Command: Install code command'"
    echo "   Then re-run ./setup.sh to install extensions."
fi

# iTerm2 setup — point iTerm2 at the repo's preferences folder
echo "🖥️  Setting up iTerm2 preferences..."
defaults write com.googlecode.iterm2 PrefsCustomFolder -string "$REPO_DIR/preferences/iterm"
defaults write com.googlecode.iterm2 LoadPrefsFromCustomFolder -bool true

# Lasso setup
# Note: the plist must be copied (macOS preferences system ignores symlinks).
# Application Support files are symlinked so changes sync automatically.
echo "🪟 Setting up Lasso window management preferences..."
mkdir -p "$HOME/Library/Application Support/Lasso"
cp "$REPO_DIR/preferences/lasso/com.heavylightapps.lasso.plist" "$HOME/Library/Preferences/"
for f in "$REPO_DIR/preferences/lasso/Application Support/"*; do
    ln -sf "$f" "$HOME/Library/Application Support/Lasso/$(basename "$f")"
done

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
