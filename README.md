My Personal Tools and Settings for Development and stuff

## Setup Pre-requisites

- [chrome](https://www.google.ca/chrome/?brand=CHBD&gclid=CjwKCAjw9dboBRBUEiwA7VrrzSjFTd7ABOJR75htdglTzZuv4naAyByJEfF38wkHZy5hHDfkCbvUThoCH90QAvD_BwE&gclsrc=aw.ds)
- [alfred 4](https://www.alfredapp.com/)
- [iterm 2](https://www.iterm2.com/downloads.html)
- [docker(ph)](https://download.docker.com/mac/stable/26764/Docker.dmg)
- [divvy](https://mizage.com/divvy/)
- [VS Code](https://code.visualstudio.com/Download)
- [Slack](https://slack.com/intl/en-ca/downloads/mac)
- (included ./fonts) [Fira Code](https://github.com/tonsky/FiraCode)
- [Git checkout](https://medium.com/@ljn6176/how-to-switch-git-branches-more-gracefully-b1ffbc1c49eb)

## Setup Git Hub SSH

```
ssh-keygen -t rsa -b 4096
pbcopy < ~/.ssh/id_rsa.pub
```

## Get started

First, install all prerequisite programs
```

cd ~

chsh -s /bin/bash

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# not sure yet => brew install rbenv

mkdir Workspace
cd Workspace
git clone git@github.com:zyqxd/my-stuff.git

cd my-stuff
./setup.sh
```

## VS Code Setup

To enable code CLI, Open up vscode command command palette - 

Search for `install 'code' command in PATH`

## Iterm setup

After installing iterm, go to `preferences > Load preferences from a custom folder or URL`

Select `my-stuff/preferences/iterm`

#### Extensions

Generate: `code --list-extensions | xargs -L 1 echo code --install-extension`

```
code --install-extension akamud.vscode-theme-onedark
code --install-extension dnicolson.binary-plist
code --install-extension eamodio.gitlens
code --install-extension enochc.copy-relative-path
code --install-extension Equinusocio.vsc-community-material-theme
code --install-extension Equinusocio.vsc-material-theme
code --install-extension equinusocio.vsc-material-theme-icons
code --install-extension esbenp.prettier-vscode
code --install-extension ex-codes.pine-script-syntax-highlighter
code --install-extension fabiospampinato.vscode-open-in-github
code --install-extension file-icons.file-icons
code --install-extension flowtype.flow-for-vscode
code --install-extension GitHub.copilot
code --install-extension hashicorp.terraform
code --install-extension janisdd.vscode-edit-csv
code --install-extension kumar-harsh.graphql-for-vscode
code --install-extension mechatroner.rainbow-csv
code --install-extension mikestead.dotenv
code --install-extension misogi.ruby-rubocop
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode-remote.remote-containers
code --install-extension rebornix.ruby
code --install-extension rvest.vs-code-prettier-eslint
code --install-extension shd101wyy.markdown-preview-enhanced
code --install-extension vitaliymaz.vscode-svg-previewer
code --install-extension vscodevim.vim
code --install-extension wingrunr21.vscode-ruby
code --install-extension yo1dog.cursor-align
code --install-extension yzhang.markdown-all-in-one
```

## notes

Things to install
homebrew
git
Chrome
Divvy
Alfred
iTerm
vscode
