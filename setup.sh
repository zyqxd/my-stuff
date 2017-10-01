# enable hold movement in vim
defaults write -g ApplePressAndHoldEnabled -bool false

# setup bash profile
ln -s settings/bash_profile ~/.bash_profile
ln -s settings/git-prompt.sh ~/.git-prompt.sh
. ~/.bash_profile
