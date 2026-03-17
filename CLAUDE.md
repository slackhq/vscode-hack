# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension providing Hack language and HHVM debugger support. Published to the VS Code Marketplace as `pranayagarwal.vscode-hack`. Repository owned by Slack (`slackhq/vscode-hack`).

## Build & Development Commands

- **Install dependencies:** `npm install`
- **Compile:** `npm run compile` (runs `tsc -p ./`)
- **Watch mode:** `npm run watch` (runs `tsc -watch -p ./`)
- **Run tests:** `npm test` (compiles first via `pretest`, then runs integration tests using `@vscode/test-electron` which downloads a VS Code instance)
- **Package extension:** `npm run package` (uses `vsce package`)

To debug the extension in VS Code, use the "Run Extension" launch configuration which opens a new Extension Host window.

## Architecture

The extension activates when a workspace contains a `.hhconfig` file. Entry point is `src/main.ts`.

**Key modules:**
- `src/LSPHackTypeChecker.ts` — Typechecker integration using `hh_client` in LSP mode via `vscode-languageclient`.
- `src/Config.ts` — Reads all `hack.*` VS Code settings at extension startup (not dynamically reloaded except for `hack.remote.*` which prompts a window reload)
- `src/proxy.ts` — Wraps `hh_client` CLI invocations (version check, type-at-pos, autocomplete, format, etc.), always passing `--json`
- `src/remote.ts` — Translates commands/args for SSH or Docker remote execution based on `hack.remote.*` config
- `src/LSPHHASTLint.ts` — Separate LSP client for HHAST linting
- `src/debugger.ts` — Standalone debug adapter (thin TCP-to-stdin/stdout bridge since HHVM speaks the debug protocol over TCP). Runs as a separate Node process (`out/debugger`)
- `src/coveragechecker.ts` — Hack type coverage percentage display using LSP `typeCoverage` capability

**Type definitions** are in `src/types/hack.d.ts` (Hack tool response types) and `src/types/lsp.d.ts` (custom LSP extensions).

## TypeScript Configuration

- Target: ES2020, Module: CommonJS
- Strict mode enabled
- Source in `src/`, compiled output in `out/`
