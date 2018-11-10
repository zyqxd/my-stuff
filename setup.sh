# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 15
defaults write -g KeyRepeat -int 2

# setup bash profile
ln -sf ~/Workspace/my-stuff/preferences/bash/bash_profile ~/.bash_profile
ln -sf ~/Workspace/my-stuff/preferences/bash/git-prompt.sh ~/.git-prompt.sh

# setup git
ln -sf ~/Workspace/my-stuff/preferences/gitignore ~/.gitignore

# Setup vscode
ln -sf ~/Workspace/my-stuff/preferences/vscode/vscode.css ~/.vscode.css
ln -sf ~/Workspace/my-stuff/preferences/vscode/vscode.json $HOME/Library/Application\ Support/Code/User/settings.json

source ~/.bash_profile

git config --global core.excludesfile ~/.gitignore
