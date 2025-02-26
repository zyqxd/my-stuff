My Personal Tools and Settings for Development and stuff

## Setup Pre-requisites

- [chrome](https://www.google.ca/chrome/?brand=CHBD&gclid=CjwKCAjw9dboBRBUEiwA7VrrzSjFTd7ABOJR75htdglTzZuv4naAyByJEfF38wkHZy5hHDfkCbvUThoCH90QAvD_BwE&gclsrc=aw.ds)
- [alfred](https://www.alfredapp.com/)
- [iterm 2](https://www.iterm2.com/downloads.html)
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

# If you need to change default to bash
chsh -s /bin/bash

# Install brew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

mkdir Development
cd Development
git clone git@github.com:zyqxd/my-stuff.git

cd my-stuff
./setup.sh
```

## VS Code Setup

To enable code CLI, Open up vscode command command palette - 

Search for `shell`

## Iterm setup

After installing iterm, go to `preferences > Load preferences from a custom folder or URL`

Select `my-stuff/preferences/iterm`

## Setup divvy

After installing divvy, run

`pbcopy < preferences/divvy/divvy`

Paste into Safari

#### Extensions

Generate: `code --list-extensions | xargs -L 1 echo code --install-extension`

```
code --install-extension attilabuti.vscode-mjml
code --install-extension craigmaslowski.erb
code --install-extension dnicolson.binary-plist
code --install-extension eamodio.gitlens
code --install-extension enochc.copy-relative-path
code --install-extension esbenp.prettier-vscode
code --install-extension evgeniypeshkov.syntax-highlighter
code --install-extension ex-codes.pine-script-syntax-highlighter
code --install-extension fabiospampinato.vscode-open-in-github
code --install-extension file-icons.file-icons
code --install-extension flowtype.flow-for-vscode
code --install-extension github.copilot
code --install-extension github.copilot-chat
code --install-extension golang.go
code --install-extension hashicorp.terraform
code --install-extension janisdd.vscode-edit-csv
code --install-extension kumar-harsh.graphql-for-vscode
code --install-extension mechatroner.rainbow-csv
code --install-extension mikestead.dotenv
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode-remote.remote-containers
code --install-extension rvest.vs-code-prettier-eslint
code --install-extension shd101wyy.markdown-preview-enhanced
code --install-extension shopify.ruby-lsp
code --install-extension sianglim.slim
code --install-extension t3dotgg.vsc-material-theme-but-i-wont-sue-you
code --install-extension vitaliymaz.vscode-svg-previewer
code --install-extension vscodevim.vim
code --install-extension vsls-contrib.gistfs
code --install-extension yo1dog.cursor-align
code --install-extension yzhang.markdown-all-in-one
code --install-extension zxh404.vscode-proto3
```
