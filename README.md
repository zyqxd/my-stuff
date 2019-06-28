My Personal Tools and Settings for Development and stuff

## Setup Pre-requisites

[chrome](https://www.google.ca/chrome/?brand=CHBD&gclid=CjwKCAjw9dboBRBUEiwA7VrrzSjFTd7ABOJR75htdglTzZuv4naAyByJEfF38wkHZy5hHDfkCbvUThoCH90QAvD_BwE&gclsrc=aw.ds)
[alfred 4](https://www.alfredapp.com/)
[iterm 2](https://www.iterm2.com/downloads.html)
[docker(ph)](https://download.docker.com/mac/stable/26764/Docker.dmg)
[divvy](https://mizage.com/divvy/)
[VS Code](https://code.visualstudio.com/Download)
(included ./fonts) [Fira Code](https://github.com/tonsky/FiraCode)

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

Open up vscode - Search for `install 'code' command in PATH`

#### Extensions

```
CoenraadS.bracket-pair-colorizer-2
eamodio.gitlens
enochc.copy-relative-path
Equinusocio.vsc-material-theme
equinusocio.vsc-material-theme-icons
esbenp.prettier-vscode
gcazaciuc.vscode-flow-ide
kumar-harsh.graphql-for-vscode
ms-azuretools.vscode-docker
ms-vscode.vscode-typescript-tslint-plugin
rebornix.ruby
shd101wyy.markdown-preview-enhanced
vscodevim.vim
```
