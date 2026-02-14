#!/bin/bash

# David Zhang's Complete Development Environment Setup
# This script installs packages AND configures preferences

set -e  # Exit on any error

echo "🚀 David's Complete Development Environment Setup"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "Brewfile" ]; then
    echo "❌ Error: Please run this script from ~/Development/my-stuff directory"
    echo "   cd ~/Development/my-stuff && ./setup.sh"
    exit 1
fi

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

# Vim key repeat settings
echo "⌨️  Configuring vim key repeat settings..."
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 20
defaults write -g KeyRepeat -int 2

# Bash profile setup
echo "🐚 Setting up bash profile..."
ln -sf ~/Development/my-stuff/preferences/bash/profile ~/.bash_profile

# Git configuration
echo "📝 Setting up git configuration..."
ln -sf ~/Development/my-stuff/preferences/git/prompt.sh ~/.git-prompt.sh
ln -sf ~/Development/my-stuff/preferences/git/autocomplete.bash ~/.git-autocomplete.bash
ln -sf ~/Development/my-stuff/preferences/git/ignore ~/.gitignore
ln -sf ~/Development/my-stuff/preferences/git/config ~/.gitconfig

# VS Code setup
echo "💻 Setting up VS Code preferences..."
mkdir -p "$HOME/Library/Application Support/Code/User"
ln -sf ~/Development/my-stuff/preferences/vscode/settings.json "$HOME/Library/Application Support/Code/User/settings.json"
ln -sf ~/Development/my-stuff/preferences/vscode/keybindings.json "$HOME/Library/Application Support/Code/User/keybindings.json"

# Lasso setup
echo "🪟 Setting up Lasso window management preferences..."
mkdir -p "$HOME/Library/Application Support/Lasso"
cp ~/Development/my-stuff/preferences/lasso/com.heavylightapps.lasso.plist "$HOME/Library/Preferences/"
cp -r ~/Development/my-stuff/preferences/lasso/Application\ Support/* "$HOME/Library/Application Support/Lasso/"

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
echo "   2. Set up iTerm2 preferences (Preferences > Load from custom folder)"
echo "      └─ Select: ~/Development/my-stuff/preferences/iterm"
echo "   3. Launch Lasso to activate your window management shortcuts"
echo "   4. Install VS Code extensions:"
echo "      └─ Open VS Code > Command Palette > 'Shell Command: Install code command'"
echo "      └─ Then run the extension install commands from README.md"
echo ""
echo "✨ Your development environment is ready!"
