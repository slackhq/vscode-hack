/**
 * @file Integration with The HHAST Linter via the LSP
 */

import * as fs from 'fs';
import * as vscode from 'vscode';
import { HandleDiagnosticsSignature, LanguageClient } from 'vscode-languageclient';
import * as config from './Config';

type LintMode = 'whole-project' | 'open-files';
type InitializationOptions = {
  'lintMode' ?: LintMode;
};

export class LSPHHASTLint {
  private context: vscode.ExtensionContext;
  private hhastPath: string;

  constructor(context: vscode.ExtensionContext, hhastPath: string) {
    this.context = context;
    this.hhastPath = hhastPath;
  }

  /** Start if HHAST support is enabled, the project uses HHAST, and the user
   * enables HHAST support for this project.
   */
  public static async START_IF_CONFIGURED_AND_ENABLED(context: vscode.ExtensionContext): Promise<void> {
    if (!config.useHhast) {
      return;
    }
    const workspace = config.workspace;
    const usesLint: boolean = await new Promise<boolean>((resolve, _) => fs.access(`${workspace}/hhast-lint.json`, err => resolve(!err)));
    if (!usesLint) {
      return;
    }

    const rawHhastPath = config.hhastPath;
    const hhastPath = rawHhastPath && rawHhastPath[0] !== '/'
      ? `${workspace}/${rawHhastPath}`
      : rawHhastPath;
    if (!hhastPath) {
      return;
    }
    const hhastExists: boolean = await new Promise<boolean>((resolve, _) => fs.access(hhastPath, err => resolve(!err)));
    if (!hhastExists) {
      return;
    }

    const remembered = config.hhastRememberedWorkspaces[workspace];
    if (remembered === 'trusted') {
      await (new LSPHHASTLint(context, hhastPath)).run();
      return;
    } else if (remembered === 'untrusted') {
      return;
    }

    const result = await vscode.window.showWarningMessage(
      `This project uses ${hhastPath} to lint? This has the same security risks as executing any other code in the repository.`,
      {},
      'Yes',
      'Always',
      'No',
      'Never'
    );
    switch (result) {
      // @ts-ignore: Fallthrough case in switch
      case 'Always':
        await config.rememberHhastWorkspace(workspace, 'trusted');
      case 'Yes':
        await (new LSPHHASTLint(context, hhastPath)).run();
        break;
      // @ts-ignore: Fallthrough case in switch
      case 'Never':
        await config.rememberHhastWorkspace(workspace, 'untrusted');
      case 'No':
        return;
      default:
        return;
    }
  }

  public async run(): Promise<void> {
    const initializationOptions: InitializationOptions = {};
    const lintMode = config.hhastLintMode;
    if (lintMode) {
      initializationOptions.lintMode = lintMode;
    }

    const hhast = new LanguageClient(
      'hack',
      'HHAST',
      { command: this.hhastPath, args: [...config.hhastArgs, '--mode', 'lsp', '--from', 'vscode-hack'] },
      {
        documentSelector: [{ language: 'hack', scheme: 'file' }],
        initializationOptions: initializationOptions,
        middleware: {
          handleDiagnostics: this.handleDiagnostics
        }
      }
    );
    this.context.subscriptions.push(hhast.start());
  }

  private handleDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[], next: HandleDiagnosticsSignature) {
    next(uri, diagnostics.map(d => {
      d.message = `${d.code}: ${d.message}`;
      return d;
    }));
  }
}
