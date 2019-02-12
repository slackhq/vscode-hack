# Changelog

See the full list of recent releases and features added on the [Github releases page](https://github.com/PranayAgarwal/vscode-hack/releases).

## v1.2.0 - 2019-02-12
- **Support for `.hack` files** — VS Code will automatically classify files with the `.hack` extension as Hack, and these files will now syntax highlight correctly even without the `<?hh` opener. (`.hack` files are supported in HHVM 4.0.0 onward, so you will see typechecker errors if you are using them with an earlier version).

## v1.1.0 - 2018-11-12
- Moved project repository to https://github.com/slackhq org and added required notices and docs
- Enabled LSP request tracing for hhast-lint
- Fixed typo in hhast-lint security prompt text
- Language syntax now tracks [atom-ide-hack](https://github.com/hhvm/atom-ide-hack) project

## v1.0.1 - 2018-07-26
- Add automatic LSP request tracing via new `hack.tracing.server` config option (thanks [@auchenberg](https://github.com/auchenberg)!)

## v1.0.0 - 2018-07-19
- **Integration with HHAST Linter** (thanks [@fredemmott](https://github.com/fredemmott)!). The extension now supports Hack linting and autofixing via [HHAST](https://github.com/hhvm/hhast/) (v3.27.2 or later required). Set up linting for your project by following instructions in the HHAST library, then look at workspace-specific linter settings in the extension Configuration section.
- Type coverage now uses the language server
- [Fix] Output panel will no longer automatically steal focus on extension errors

## v0.8.5 - 2018-07-09
- Only send LSP requests for documents with `file://` scheme
- Send LSP initializtion option to use text edit autocomplete (fixes broken variable completion)

## v0.8.4 - 2018-06-04
- Syntax highlighting for `.hhconfig` file
- Added support for showing related messages for an error when running in non-LSP mode

## v0.8.3 - 2018-05-30
- Fixed bug in debug launch mode to correctly recognize extra args passed to HHVM

## v0.8.2 - 2018-05-28
- Documents are now recognized as Hack if they start with a shebang pointing to an HHVM executable (e.g. `#!/usr/bin/hhvm`), regardless of extension
- Debugger bug fixes (stop debug session from getting stuck on bad socket connection, copy configuration snippet templates correctly)

## v0.8.1 - 2018-05-14
- Updated Hack language syntax to the latest version
- Removed some unnecessary PHP snippets
- Fixed file path mapping in typechecker requests & responses to use the correct scheme (thanks [@fredemmott](https://github.com/fredemmott) for the thorough investigation)

## v0.8.0 - 2018-05-10
- **HHVM Debugger (Alpha version)** — Launch scripts or attach to an HHVM server straight from VS Code. See the [debugger doc](https://github.com/PranayAgarwal/vscode-hack/blob/master/docs/debugging.md) for details on setup and usage. _This is a very early release. Please file any bugs at the Issues page._
- Hack coverage check works again. A new icon in the editor status bar shows % coverage for the file and can be clicked to highlight uncovered areas. (Can be disabled by setting `"hack.enableCoverageCheck": false`)

## v0.7.0 - 2018-01-25
- Language Server mode is now on by default for users running HHVM 3.23 or later. Add `"hack.useLanguageServer": false` to your workspace config to disable it.

## v0.6.2 - 2017-11-20
- Extend Language Server mode support to containerized typechecker instances as well.

## v0.6.1 - 2017-11-19
- Patch to include "vscode-languageclient" package in `dependencies` section rather than `devDependencies`.

## v0.6.0 - 2017-11-19
- Experimental Language Server support:
  - If you are running HHVM 3.23 or later, add `"hack.useLanguageServer": true` to your workspace config to start hh_client in Language Server mode (see [#15](https://github.com/PranayAgarwal/vscode-hack/issues/15) for more context).
- Support for running against a containerized Hack typecheck server (see Docker section in README). Thanks [@beatscode](https://github.com/beatscode)!
- Fixed [#13](https://github.com/PranayAgarwal/vscode-hack/issues/13) - Running formatter removes last line of file if there is no trailing newline. Thanks [@beefsack](https://github.com/beefsack)!
- Updated Hack language grammar to latest version.
- Development changes:
  - Bumped up minimum supported VS Code engine version to 1.15.0 for better extension API compatibility.
  - Project is now compiled in TypeScript strict mode.

## v0.5.0 - 2017-04-06
- Added Code Actions to automatically suppress typechecker errors via HH_FIXME comments.

## v0.4.0 - 2017-03-24
- Fixed document symbol outline (⇧⌘O) break in newer hh_client versions.
- Added a new setting to enable type coverage checking (now off by default).
- Updated Hack grammar for better syntax highlighting.
- Lots of performance improvements, mainly by refactoring the codebase to use async/await.
- Works best with HHVM 3.18 or later.

## v0.2.2 - 2016-11-07
- Added error code to typechecker messages.
- Minor autocomplete updates:
    - Triggers on namespace segment (\\).
  - Recognizes constructors correctly.

## v0.2.1 - 2016-10-18
- Added ability to toggle Hack coverage highlighting from percentage indicator in status bar.
- Added workspace symbol search functionality.
- Updated Hack grammar to latest version (from Nuclide repository).

## v0.1.2 - 2016-10-18
- Added support for custom hh_client path.
- Fixed incorrect namespace suggestion in autocomplete.

## v0.1.1 - 2016-10-13
- Updated extension icon and README file.

## v0.1.0 - 2016-10-13
- Very early in development release of Hack for Visual Studio Code.
