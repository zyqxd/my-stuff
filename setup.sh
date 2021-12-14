#!/bin/sh

# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 20
defaults write -g KeyRepeat -int 2

# setup bash profile
ln -sf ~/Workspace/my-stuff/preferences/bash/profile ~/.bash_profile

# setup git
ln -sf ~/Workspace/my-stuff/preferences/git/prompt.sh ~/.git-prompt.sh
ln -sf ~/Workspace/my-stuff/preferences/git/autocomplete.bash ~/.git-autocomplete.bash
ln -sf ~/Workspace/my-stuff/preferences/git/ignore ~/.gitignore
ln -sf ~/Workspace/my-stuff/preferences/git/config ~/.gitconfig

# Setup vscode
ln -sf ~/Workspace/my-stuff/preferences/vscode/vscode.css ~/.vscode.css
ln -sf ~/Workspace/my-stuff/preferences/vscode/settings.json $HOME/Library/Application\ Support/Code/User/settings.json
ln -sf ~/Workspace/my-stuff/preferences/vscode/keybindings.json $HOME/Library/Application\ Support/Code/User/keybindings.json

# Setup divvy
ln -sf ~/Workspace/my-stuff/preferences/divvy/com.mizage.direct.Divvy.plist $HOME/Library/Preferences/com.mizage.direct.Divvy.plist

source ~/.bash_profile

git config --global core.excludesfile ~/.gitignore
