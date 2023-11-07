#!/bin/sh

# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 20
defaults write -g KeyRepeat -int 2

# setup bash profile
ln -sf ~/Development/my-stuff/preferences/bash/profile ~/.bash_profile

# setup git
ln -sf ~/Development/my-stuff/preferences/git/prompt.sh ~/.git-prompt.sh
ln -sf ~/Development/my-stuff/preferences/git/autocomplete.bash ~/.git-autocomplete.bash
ln -sf ~/Development/my-stuff/preferences/git/ignore ~/.gitignore
ln -sf ~/Development/my-stuff/preferences/git/config ~/.gitconfig

# Setup vscode
ln -sf ~/Development/my-stuff/preferences/vscode/vscode.css ~/.vscode.css
ln -sf ~/Development/my-stuff/preferences/vscode/settings.json $HOME/Library/Application\ Support/Code/User/settings.json
ln -sf ~/Development/my-stuff/preferences/vscode/keybindings.json $HOME/Library/Application\ Support/Code/User/keybindings.json

source ~/.bash_profile

git config --global core.excludesfile ~/.gitignore
