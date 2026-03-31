/**
 * @file Integration with the Hack type checker via the LSP
 */
import * as vscode from "vscode";
import {
  HandleDiagnosticsSignature,
  LanguageClient,
  RevealOutputChannelOn,
  LanguageClientOptions,
  ServerOptions,
  State,
} from "vscode-languageclient/node";
import { HackConfig } from "./Config";
import { HackCoverageChecker } from "./coveragechecker";
import * as remote from "./remote";
import * as hack from "./types/hack";
import * as utils from "./Utils";
import { ShowStatusRequest } from "./types/lsp";
import * as hh_client from "./proxy";
import { HackLanguageServerErrorHandler } from "./HackLanguageServerErrorHandler";
import { HackLanguageServerStatus } from "./HackLanguageServerStatus";

export class LSPHackTypeChecker {
  private languageClient: LanguageClient | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private config: HackConfig,
    private status: HackLanguageServerStatus,
    private errorHandler: HackLanguageServerErrorHandler,
    private log: vscode.LogOutputChannel,
  ) {}

  public static IS_SUPPORTED(version: hack.Version): boolean {
    return version.api_version >= 5;
  }

  public async run(): Promise<void> {
    const context = this.context;

    context.subscriptions.push(
      vscode.commands.registerCommand("hack.restartLSP", async () => {
        if (await this.errorHandler.tryToRunHHClient()) {
          await this.languageClient?.restart();
        }
      }),
    );

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: `Running Hack typechecker`,
      },
      async () => {
        await hh_client.start(this.config, this.log);
      },
    );

    const serverOptions: ServerOptions = {
      command: remote.getCommand(this.config, this.config.clientPath),
      args: remote.getArgs(this.config, this.config.clientPath, [
        "lsp",
        "--from",
        "vscode-hack",
      ]),
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ language: "hack", scheme: "file" }],
      initializationOptions: { useTextEditAutocomplete: true },
      uriConverters: {
        code2Protocol: (uri) => utils.mapFromWorkspaceUri(this.config, uri),
        protocol2Code: (file) => utils.mapToWorkspaceUri(this.config, file),
      },
      middleware: {
        handleDiagnostics: (uri, diagnostics, next) => {
          this.handleDiagnostics(uri, diagnostics, next);
        },
      },
      // Hack returns errors if commands fail due to syntax errors. Don't
      // automatically switch to the Output pane in this case.
      revealOutputChannelOn: RevealOutputChannelOn.Never,
      errorHandler: this.errorHandler,
    };

    const languageClient = new LanguageClient(
      "hack",
      "Hack Language Server",
      serverOptions,
      clientOptions,
    );
    this.languageClient = languageClient;

    languageClient.onDidChangeState((e) => {
      if (e.newState === State.Running) {
        this.status.showSuccess();
      }
    });

    languageClient.onRequest(
      "window/showStatus",
      (params: ShowStatusRequest) => {
        if (params.type === 1 || params.type === 2) {
          this.status.showAlert(params.shortMessage, params.message);
        } else {
          this.status.showSuccess(params.shortMessage, params.message);
        }
        return {};
      },
    );

    await languageClient.start();
    this.context.subscriptions.push(languageClient);

    if (
      this.config.enableCoverageCheck &&
      languageClient.initializeResult &&
      (<any>languageClient.initializeResult.capabilities).typeCoverageProvider
    ) {
      await new HackCoverageChecker(languageClient).start(context);
    }
  }

  private handleDiagnostics(
    uri: vscode.Uri,
    diagnostics: vscode.Diagnostic[],
    next: HandleDiagnosticsSignature,
  ) {
    // If the Hack LSP loses connectivity with hh_server, it publishes a special custom diagnostic event. Rather than
    // show it as a regular error, we instead capture it and add a more prominent status bar indicator instead.
    if (
      diagnostics.length > 0 &&
      diagnostics[0].source === "hh_server" &&
      diagnostics[0].message.startsWith("hh_server isn't running")
    ) {
      this.status.showError(
        "Hack Language Server disconnected. Language features will be unavailable. Click to restart.",
        "hack.restartLSP",
      );
    } else {
      // Handle regular errors
      next(
        uri,
        diagnostics.map((d) => {
          // See https://github.com/facebook/hhvm/blob/028402226993d53d68e17125e0b7c8dd87ea6c17/hphp/hack/src/errors/errors.ml#L174
          let kind: string;
          switch (Math.floor(<number>d.code / 1000)) {
            case 1:
              kind = "Parsing";
              break;
            case 2:
              kind = "Naming";
              break;
            case 3:
              kind = "NastCheck";
              break;
            case 4:
              kind = "Typing";
              break;
            case 5:
              kind = "Lint";
              break;
            case 8:
              kind = "Init";
              break;
            default:
              kind = "Other";
          }
          d.message = `${kind}[${d.code}] ${d.message}`;
          return d;
        }),
      );
    }
  }
}
