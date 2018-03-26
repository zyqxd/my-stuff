# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 15
defaults write -g KeyRepeat -int 2

# setup bash profile
ln -s settings/bash_profile ~/.bash_profile
ln -s settings/git-prompt.sh ~/.git-prompt.sh
ln -s settings/gitignore ~/.gitignore

. ~/.bash_profile

git config --global core.excludesfile ~/.gitignore
