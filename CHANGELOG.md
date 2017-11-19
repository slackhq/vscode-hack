# Changelog

See the full list of recent releases and features added on the [Github releases page](https://github.com/PranayAgarwal/vscode-hack/releases).

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
