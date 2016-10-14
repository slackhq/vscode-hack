# Hack for Visual Studio Code

[![Build Status](https://travis-ci.org/PranayAgarwal/vscode-hack.svg?branch=master)](https://travis-ci.org/PranayAgarwal/vscode-hack)

This extension adds rich Hack language & HHVM support to Visual Studio Code. Visit [http://hacklang.org](http://hacklang.org) to get started with Hack.

It is published in the Visual Studio Marketplace [here](https://marketplace.visualstudio.com/items?itemName=pranayagarwal.vscode-hack). To install, search for "Hack" in the VS Code extensions tab or run the following command (⌘+P): ```ext install vscode-hack```.

**NOTE: This is a *very* early preview release.**

## Features

* Type Checking
* Autocomplete
* Hover Hints
* Document Symbol Outline
* Document Formatting
* Go To/Peek Definition
* Find All References
* Hack Coverage Check

![Hack for Visual Studio Code](https://cloud.githubusercontent.com/assets/341507/19377806/d7838da0-919d-11e6-9873-f5a6aa48aea4.gif)

## Requirements

This extension is currently only supported on Linux. The latest version of HHVM is required on the machine, and `hh_client` should be added to the $PATH. The workspace should have a `.hhconfig` file at its root.    

## Issues

Please file all bugs, issues, feature requests etc. at the [GitHub project issues page](https://github.com/PranayAgarwal/vscode-hack/issues).

*Current known issues:*

- The editor may not select the Hack language mode for `.php` files even if they start with ```<?hh```. To get around this, either manually select "Hack" as the file language from the selector on the bottom right of the screen, or configure your project workspace to open all `.php` files in Hack mode by adding the following to your workspace settings:

```json
    "files.associations": {
        "*.php": "hack"
    }
```
## Contributing

The project will be open to contributions once the inital release is feature complete and a beta version is launched in the Visual Studio Code extension gallery. 

## Changelog

Please see our [list of recent releases and features added](https://github.com/PranayAgarwal/vscode-hack/releases). 

## License

The source code for this extension is available at [https://github.com/PranayAgarwal/vscode-hack](https://github.com/PranayAgarwal/vscode-hack) and is licenced under the [MIT license](LICENSE.md).
