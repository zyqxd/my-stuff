# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 15
defaults write -g KeyRepeat -int 2

# setup bash profile
ln -sf ~/Workspace/Tools/settings/bash_profile ~/.bash_profile
ln -sf ~/Workspace/Tools/settings/git-prompt.sh ~/.git-prompt.sh
ln -sf ~/Workspace/Tools/settings/gitignore ~/.gitignore

# Setup vscode
ln -sf ~/Workspace/Tools/settings/vscode/vscode.css ~/.vscode.css
ln -sf ~/Workspace/Tools/settings/vscode/vscode.json $HOME/Library/Application\ Support/Code/User/settings.json

source ~/.bash_profile

git config --global core.excludesfile ~/.gitignore
