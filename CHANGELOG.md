# Changelog

See the full list of recent releases and features added on the [Github releases page](https://github.com/PranayAgarwal/vscode-hack/releases).

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
