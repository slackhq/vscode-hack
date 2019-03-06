# Hack for Visual Studio Code

[![Build Status](https://travis-ci.org/slackhq/vscode-hack.svg?branch=master)](https://travis-ci.org/slackhq/vscode-hack)

This extension adds rich Hack language & HHVM support to Visual Studio Code. Visit [http://hacklang.org](http://hacklang.org) to get started with Hack.

It is published in the Visual Studio Marketplace [here](https://marketplace.visualstudio.com/items?itemName=pranayagarwal.vscode-hack). To install, search for "Hack" in the VS Code extensions tab or run the following command (⌘+P): ```ext install vscode-hack```.

## Latest releases

## v2.0.0
- **Remote language server connection support** — You can now connect to an external development environment for Hack typechecking, linting and all other intellisense features. Current supported methods are SSH and Docker. See the **Remote Development** section below for more details.
  - This version may cause breaking changes to your existing setup if you were already using Docker via a custom `hack.clientPath` executable.
  - The `hack.workspaceRootPath` config has been renamed to `hack.remote.workspacePath`.
- Running the extension with LSP mode disabled is now unsupported. It will be fully removed in a future version of the extension.

## v1.2.0
- **Support for `.hack` files** — VS Code will automatically classify files with the `.hack` extension as Hack, and these files will now syntax highlight correctly even without the `<?hh` opener. (`.hack` files are supported in HHVM 4.0.0 onward, so you will see typechecker errors if you are using them with an earlier version).

See the full list of releases and features added on the [Github releases page](https://github.com/slackhq/vscode-hack/releases) as well as the project [changelog](https://github.com/slackhq/vscode-hack/blob/master/CHANGELOG.md).

## Features

* Type Checking
* Autocomplete
* Hover Hints
* Document Symbol Outline
* Workspace Symbol Search
* Document Formatting
* Go To/Peek Definition
* Find All References
* Hack Coverage Check
* Linting and Autofixing
* [Local and Remote Debugging](https://github.com/slackhq/vscode-hack/blob/master/docs/debugging.md)

![Hack for Visual Studio Code](https://cloud.githubusercontent.com/assets/341507/19377806/d7838da0-919d-11e6-9873-f5a6aa48aea4.gif)

## Requirements

This extension is supported on Linux and Mac OS X 10.10 onwards ([see HHVM compatibility](https://docs.hhvm.com/hhvm/installation/introduction)). The latest versions of Hack typechecking tools (`hh_client` and `hh_server`) are required on the local machine or via a remote connection. The workspace should have a `.hhconfig` file at its root.    

## Configuration

This extension adds the following Visual Studio Code settings. These can be set in user preferences (⌘+,) or workspace settings (`.vscode/settings.json`).

* `hack.clientPath`: Absolute path to the hh_client executable. This can be left empty if hh_client is already in your environment $PATH.
* `hack.enableCoverageCheck`: Enable calculation of Hack type coverage percentage for every file and display in status bar (default: `true`).
* `hack.useLanguageServer`: Start hh_client in Language Server mode. Only works for HHVM version 3.23 and above (default: `true`).
* `hack.useHhast`: Enable linting (needs [HHAST](https://github.com/hhvm/hhast) library set up and configured in project) (default: `true`).
* `hack.hhastPath`: Use an alternate `hhast-lint` path. Can be abolute or relative to workspace root (default: `vendor/bin/hhast-lint`).
* `hack.hhastArgs`: Optional list of arguments passed to hhast-lint executable.
* `hack.hhastLintMode`: Whether to lint the entire project (`whole-project`) or just the open files (`open-files`).
* `hack.rememberedWorkspaces`: Workspaces where whether or not to run custom Hack executables (e.g. hhast-lint) has been remembered. **Note:** This config can only be defined in VS Code global (user) settings.

### Remote Development

The extension supports connecting to an external HHVM development environment for local typechecking, linting and all other intellisense features. The current supported connection methods are SSH into a remote host or exec in a local Docker container.

To enable this, set the following config values:

* `hack.remote.enabled`: Run the Hack language tools on an external host (deafult: `false`).
* `hack.remote.type`: The remote connection method (`ssh` or `docker`).
* `hack.remote.workspacePath`: Absolute location of workspace root in the remote file system. If empty, this defaults to the local workspace path.

**For SSH:**
* `hack.remote.ssh.host`: Address for the remote development server to connect to (in the format `[user@]hostname`).
* `hack.remote.ssh.flags`: Additional command line options to pass when establishing the SSH connection (*Optional*).

Make sure to test SSH connectivity and credentials beforehand. You should also ensure that the source stays in sync between the local and remote machines (the extension doesn't currently handle this).

```bash
$ ssh user@my-remote-host.com "cd /mnt/project && hh_client"
No errors!
```

**For Docker:**
* `hack.remote.docker.containerName`: Name of the local Docker container to run the language tools in.

Make sure the container is already running on your local machine, and has the required HHVM setup. You can pull an [official HHVM image](https://hub.docker.com/r/hhvm/hhvm/) from Docker hub and even run multiple versions simultaneously.
```bash
$ docker run -d -t --name my-hhvm -v /home/user/repos/project:/mnt/project hhvm/hhvm:latest
$ docker exec --workdir /mnt/project my-hhvm hh_client
No errors!
```

## Issues

Please file all bugs, issues, feature requests etc. at the [GitHub issues page](https://github.com/slackhq/vscode-hack/issues).

## Contributing

There are lots of ways to help! You can file new bugs and feature requests, or fix a pending one. To contribute to the source code, fork the repository on GitHub and create a pull request. Please read our [Contributors Guide](CONTRIBUTING.md) and check out the [VS Code extension development guide](https://code.visualstudio.com/docs/extensions/overview) to get started.

## License

The source code for this extension is hosted at [https://github.com/slackhq/vscode-hack](https://github.com/slackhq/vscode-hack) and is available under the [MIT license](LICENSE.md).
