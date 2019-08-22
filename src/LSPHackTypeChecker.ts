/**
 * @file Integration with the Hack type checker via the LSP
 */

import * as vscode from 'vscode';
import { HandleDiagnosticsSignature, LanguageClient, RevealOutputChannelOn, LanguageClientOptions, ServerOptions, ServerCapabilities, DocumentSelector, ClientCapabilities, StaticFeature } from 'vscode-languageclient';
import * as config from './Config';
import { HackCoverageChecker } from './coveragechecker';
import * as remote from './remote';
import * as hack from './types/hack';
import * as utils from './Utils';
import { ShowStatusRequest } from './types/lsp';

export class LSPHackTypeChecker {
  private context: vscode.ExtensionContext;
  private version: hack.Version;

  constructor(context: vscode.ExtensionContext, version: hack.Version) {
    this.context = context;
    this.version = version;
  }

  public static IS_SUPPORTED(version: hack.Version): boolean {
    return version.api_version >= 5;
  }

  public async run(): Promise<void> {
    const context = this.context;
    const serverOptions: ServerOptions = {
      command: remote.getCommand(config.clientPath),
      args: remote.getArgs(config.clientPath, ['lsp', '--from', 'vscode-hack'])
    };

    const clientOptions: LanguageClientOptions = {
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
    const statusText = new StatusText(this.context, this.version);
    languageClient.registerFeatures([new ProgressBar(), statusText]);
    languageClient.onReady().then(async () => {
      languageClient.onRequest("window/showStatus", statusText.handleShowStatusRequest);
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

class ProgressBar implements StaticFeature {
  public fillClientCapabilities(capabilities: ClientCapabilities): void {
    console.log("ProgressBar fillClientCapabilities called");
    if ((capabilities as any).window) {
      (capabilities as any).window.progress = true;
    } else {
      (capabilities as any).window = { progress: true };
    }
  }

  public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void {
    // console.log("ProgressBar initialize called with capabilities: " + JSON.stringify(capabilities) + " and documentSelector: " + JSON.stringify(documentSelector));
  }
}

class StatusText implements StaticFeature {
  private versionText: string;
  private status: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext, version: hack.Version) {
    this.versionText = StatusText.getVersionText(version);
    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
    context.subscriptions.push(this.status);
  }

  public fillClientCapabilities(capabilities: ClientCapabilities): void {
    console.log("StatusText fillClientCapabilities called");
    if ((capabilities as any).window) {
      (capabilities as any).window.status = true;
    } else {
      (capabilities as any).window = { status: true };
    }
  }

  public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void {
    this.status.text = "$(alert) " + this.versionText;
    this.status.tooltip = "hh_server is not running for this workspace.";
    this.status.show();
    // console.log("StatusText initialize called with capabilities: " + JSON.stringify(capabilities) + " and documentSelector: " + JSON.stringify(documentSelector));
  }

  public handleShowStatusRequest(params: ShowStatusRequest) {
    if (params.shortMessage) {
      this.status.text = this.versionText + " " + params.shortMessage;
    } else {
      this.status.text = this.versionText
    }
    this.status.tooltip = params.message || "";

    if (params.type === 1 || params.type === 2) {
      this.status.text = "$(alert) " + this.status.text;
    }
    return {};
  }

  private static getVersionText(version: hack.Version): string {
    const hhvmVersion = version.commit.split('-').pop();
    let statusText = hhvmVersion ? `HHVM ${hhvmVersion}` : "HHVM";
    if (config.remoteEnabled && config.remoteType === 'ssh') {
      statusText += " (Remote)";
    } else if (config.remoteEnabled && config.remoteType === 'docker') {
      statusText += " (Docker)";
    }
    return statusText;
  }
}