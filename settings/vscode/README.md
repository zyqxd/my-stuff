# Microsoft VS Code IDE Settings
To setup the bestest, most hipster, optimized for viewing pleasure developement environment you can have as a developer.

I recommend trying out Fira Code ligatures if you're a JS developer to get your code to look like this:
![js example](js_example.png)


# Requirements
(v1.10.2) Visual Code
(included) Operator Mono Font
(optional recommended) [Fira Code](https://github.com/tonsky/FiraCode)
(optional recommended) [material-icon-theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)
(optional) [Firewatch Theme](https://marketplace.visualstudio.com/items?itemName=ulthes.theme-firewatch)


# Base installation
Just download the operator mono font from this code base and apply setting
````
"editor.fontFamily": "'Operator Mono', monospace"
````


# Installation for Ligatures
1) install [Fira Code font](https://github.com/tonsky/FiraCode)
2) install vs code extension [be5invis.vscode-custom-css](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css)
3) create css file with rule
````
.editor-container .mtk14  {
    font-family: 'Fira Code' !important;
}
````
4) `"vscode_custom_css.imports": ["<css_file>"]`
5) `cmd` + `shift` + `p` : Enable Custom CSS and JS
6) `cmd` + `shift` + `p` : Reload Window


