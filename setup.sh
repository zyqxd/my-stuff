# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 15
defaults write -g KeyRepeat -int 2

# setup bash profile
sudo ln -sf ~/Workspace/Tools/settings/bashrc ~/.bashrc
sudo ln -sf ~/Workspace/Tools/settings/git-prompt.sh ~/.git-prompt.sh
sudo ln -sf ~/Workspace/Tools/settings/gitignore ~/.gitignore
sudo ln -sf ~/Workspace/Tools/settings/inputrc ~/.inputrc

# Setup vscode
sudo ln -sf ~/Workspace/Tools/settings/vscode/vscode.css ~/.vscode.css
sudo ln -sf ~/Workspace/Tools/settings/vscode/vscode.json $HOME/Library/Application\ Support/Code/User/settings.json

source ~/.bashrc

git config --global core.excludesfile ~/.gitignore
