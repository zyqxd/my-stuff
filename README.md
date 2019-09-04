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

## Setup Git Hub SSH

```
ssh-keygen -t rsa -b 4096
pbcopy < ~/.ssh/id_rsa.pub
```

## Setup Homebrew

```
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

## Get started

```
cd ~
mkdir Workspace
cd Workspace
git clone git@github.com:zyqxd/my-stuff.git
cd my-stuff
./setup.sh
```

## VS Code Setup

To enable code CLI, Open up vscode - Search for `install 'code' command in PATH`

#### Extensions

Generate: `code --list-extensions | xargs -L 1 echo code --install-extension`

```
code --install-extension CoenraadS.bracket-pair-colorizer-2
code --install-extension dbaeumer.vscode-eslint
code --install-extension eamodio.gitlens
code --install-extension enochc.copy-relative-path
code --install-extension Equinusocio.vsc-material-theme
code --install-extension equinusocio.vsc-material-theme-icons
code --install-extension esbenp.prettier-vscode
code --install-extension fabiospampinato.vscode-open-in-github
code --install-extension flowtype.flow-for-vscode
code --install-extension kumar-harsh.graphql-for-vscode
code --install-extension mauve.terraform
code --install-extension misogi.ruby-rubocop
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode.vscode-typescript-tslint-plugin
code --install-extension rebornix.ruby
code --install-extension shd101wyy.markdown-preview-enhanced
code --install-extension vscodevim.vim
```
