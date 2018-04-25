# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g InitialKeyRepeat -int 15
defaults write -g KeyRepeat -int 2

# setup bash profile
ln -s -i settings/bash_profile ~/.bash_profile
ln -s -i settings/git-prompt.sh ~/.git-prompt.sh
ln -s -i settings/gitignore ~/.gitignore

. ~/.bash_profile

git config --global core.excludesfile ~/.gitignore
