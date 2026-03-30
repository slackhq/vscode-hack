/**
 * @file Integration with The HHAST Linter via the LSP
 */

import * as fs from "fs";
import * as vscode from "vscode";
import {
  HandleDiagnosticsSignature,
  LanguageClient,
} from "vscode-languageclient/node";
import { HackConfig } from "./Config";
import * as remote from "./remote";
import * as utils from "./Utils";

type LintMode = "whole-project" | "open-files";
type InitializationOptions = {
  lintMode?: LintMode;
};

export class LSPHHASTLint {
  private context: vscode.ExtensionContext;
  private config: HackConfig;
  private hhastPath: string;

  constructor(
    context: vscode.ExtensionContext,
    config: HackConfig,
    hhastPath: string,
  ) {
    this.context = context;
    this.config = config;
    this.hhastPath =
      config.remoteEnabled && config.remoteWorkspacePath
        ? hhastPath.replace(
            config.localWorkspacePath,
            config.remoteWorkspacePath,
          )
        : hhastPath;
  }

  /** Start if HHAST support is enabled, the project uses HHAST, and the user
   * enables HHAST support for this project.
   */
  public static async START_IF_CONFIGURED_AND_ENABLED(
    context: vscode.ExtensionContext,
    config: HackConfig,
  ): Promise<void> {
    if (!config.useHhast) {
      return;
    }
    const workspace = config.localWorkspacePath;
    const usesLint: boolean = await new Promise<boolean>((resolve, _) =>
      fs.access(`${workspace}/hhast-lint.json`, (err) => resolve(!err)),
    );
    if (!usesLint) {
      return;
    }

    const rawHhastPath = config.hhastPath;
    const hhastPath =
      rawHhastPath && rawHhastPath[0] !== "/"
        ? `${workspace}/${rawHhastPath}`
        : rawHhastPath;
    if (!hhastPath) {
      return;
    }
    const hhastExists: boolean = await new Promise<boolean>((resolve, _) =>
      fs.access(hhastPath, (err) => resolve(!err)),
    );
    if (!hhastExists) {
      return;
    }

    await new LSPHHASTLint(context, config, hhastPath).run();
  }

  public async run(): Promise<void> {
    const initializationOptions: InitializationOptions = {};
    const lintMode = this.config.hhastLintMode;
    if (lintMode) {
      initializationOptions.lintMode = lintMode;
    }

    const hhast = new LanguageClient(
      "hack",
      "HHAST",
      {
        command: remote.getCommand(this.config, this.hhastPath),
        args: remote.getArgs(this.config, this.hhastPath, [
          ...this.config.hhastArgs,
          "--mode",
          "lsp",
          "--from",
          "vscode-hack",
        ]),
      },
      {
        documentSelector: [{ language: "hack", scheme: "file" }],
        initializationOptions: initializationOptions,
        uriConverters: {
          code2Protocol: (uri) => utils.mapFromWorkspaceUri(this.config, uri),
          protocol2Code: (file) => utils.mapToWorkspaceUri(this.config, file),
        },
        middleware: {
          handleDiagnostics: this.handleDiagnostics,
        },
      },
    );
    await hhast.start();
    this.context.subscriptions.push(hhast);
  }

  private handleDiagnostics(
    uri: vscode.Uri,
    diagnostics: vscode.Diagnostic[],
    next: HandleDiagnosticsSignature,
  ) {
    next(
      uri,
      diagnostics.map((d) => {
        d.message = `${d.code}: ${d.message}`;
        return d;
      }),
    );
  }
}
