/**
 * @file Integration with the Hack type checker via the LSP
 */

import * as vscode from 'vscode';
import { HandleDiagnosticsSignature, LanguageClient, RevealOutputChannelOn } from 'vscode-languageclient';
import * as config from './Config';
import { HackCoverageChecker } from './coveragechecker';
import * as hack from './types/hack';
import * as utils from './Utils';

export class LSPHackTypeChecker {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static IS_SUPPORTED(version: hack.Version): boolean {
    return version.api_version >= 5;
  }

  public async run(): Promise<void> {
    const context = this.context;

    const serverOptions = {
      command: config.hhClientCommand,
      args: [...config.hhClientArgs, 'lsp', '--from', 'vscode-hack']
    };

    const clientOptions =  {
        documentSelector: [{ language: 'hack', scheme: 'file' }],
        initializationOptions: { useTextEditAutocomplete: true },
        uriConverters: { code2Protocol: utils.mapFromWorkspaceUri, protocol2Code: utils.mapToWorkspaceUri },
        middleware: {
          handleDiagnostics: this.handleDiagnostics
        },
        // Hack returns errors if commands fail due to syntax errors. Don't
        // automatically switch to the Output pane in this case.
        revealOutputChannelOn: RevealOutputChannelOn.Never
    };

    const languageClient = new LanguageClient('hack', 'Hack Language Server', serverOptions, clientOptions);

    languageClient.onReady().then(async () => {
      if (config.enableCoverageCheck && languageClient.initializeResult && (<any>languageClient.initializeResult.capabilities).typeCoverageProvider) {
        await new HackCoverageChecker(languageClient).start(context);
      }
    });
    context.subscriptions.push(languageClient.start());
  }

  private handleDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[], next: HandleDiagnosticsSignature) {
    next(uri, diagnostics.map(d => {
      // See https://github.com/facebook/hhvm/blob/028402226993d53d68e17125e0b7c8dd87ea6c17/hphp/hack/src/errors/errors.ml#L174
      let kind: string;
      switch (Math.floor((<number>d.code) / 1000)) {
        case 1:
          kind = 'Parsing';
          break;
        case 2:
          kind = 'Naming';
          break;
        case 3:
          kind = 'NastCheck';
          break;
        case 4:
          kind = 'Typing';
          break;
        case 5:
          kind = 'Lint';
          break;
        case 8:
          kind = 'Init';
          break;
        default:
          kind = 'Other';
      }
      d.message = `${kind}[${d.code}] ${d.message}`;
      return d;
    }));
  }
}
