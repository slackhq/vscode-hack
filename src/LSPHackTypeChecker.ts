/**
 * @file Integration with the Hack type checker via the LSP
 */
import { setInterval } from "node:timers/promises";
import * as vscode from "vscode";
import {
  HandleDiagnosticsSignature,
  LanguageClient,
  RevealOutputChannelOn,
  LanguageClientOptions,
  ServerOptions,
  CloseAction,
  ErrorAction,
  State,
} from "vscode-languageclient/node";
import * as config from "./Config";
import { HackCoverageChecker } from "./coveragechecker";
import * as remote from "./remote";
import * as hack from "./types/hack";
import * as utils from "./Utils";
import { ShowStatusRequest } from "./types/lsp";
import * as hh_client from "./proxy";

export class LSPHackTypeChecker {
  private context: vscode.ExtensionContext;
  private versionText: string;
  private status: vscode.StatusBarItem;
  private languageClient: LanguageClient | undefined;
  private isRestarting: boolean = false;
  private static readonly MAX_RESTART_ATTEMPTS = 30;

  constructor(context: vscode.ExtensionContext, version: hack.Version) {
    this.context = context;
    this.versionText = this.getVersionText(version);
    this.status = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      1000,
    );
    this.status.name = "Hack Language Server";
    context.subscriptions.push(this.status);
  }

  public static IS_SUPPORTED(version: hack.Version): boolean {
    return version.api_version >= 5;
  }

  public async run(): Promise<void> {
    const context = this.context;

    context.subscriptions.push(
      vscode.commands.registerCommand("hack.restartLSP", async () => {
        await this.restart();
      }),
    );

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: `Running Hack typechecker`,
      },
      async () => {
        await hh_client.start();
      },
    );

    const serverOptions: ServerOptions = {
      command: remote.getCommand(config.clientPath),
      args: remote.getArgs(config.clientPath, ["lsp", "--from", "vscode-hack"]),
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ language: "hack", scheme: "file" }],
      initializationOptions: { useTextEditAutocomplete: true },
      uriConverters: {
        code2Protocol: utils.mapFromWorkspaceUri,
        protocol2Code: utils.mapToWorkspaceUri,
      },
      middleware: {
        handleDiagnostics: (uri, diagnostics, next) => {
          LSPHackTypeChecker.handleDiagnostics(
            uri,
            diagnostics,
            next,
            this.status,
          );
        },
      },
      // Hack returns errors if commands fail due to syntax errors. Don't
      // automatically switch to the Output pane in this case.
      revealOutputChannelOn: RevealOutputChannelOn.Never,
      errorHandler: {
        error: () => ({ action: ErrorAction.Continue }),
        closed: async () => {
          // NB.: we intentionally don't await our restart attempts here so that we can return from the closed() handler.
          this.restart().catch((e) =>
            console.error("Failed to restart Hack language server", e),
          );
          return {
            action: CloseAction.DoNotRestart,
            message:
              "Hack language server exited unexpectedly. It will be automatically restarted.",
          };
        },
      },
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
        this.status.backgroundColor = undefined;
        this.status.command = undefined;
      }
    });

    languageClient.onRequest(
      "window/showStatus",
      (params: ShowStatusRequest) => {
        if (params.shortMessage) {
          this.status.text = this.versionText + " " + params.shortMessage;
        } else {
          this.status.text = this.versionText;
        }
        this.status.tooltip = params.message || "";

        if (params.type === 1 || params.type === 2) {
          this.status.text = "$(alert) " + this.status.text;
        }

        this.status.show();
        return {};
      },
    );

    await languageClient.start();
    this.context.subscriptions.push(languageClient);

    if (
      config.enableCoverageCheck &&
      languageClient.initializeResult &&
      (<any>languageClient.initializeResult.capabilities).typeCoverageProvider
    ) {
      await new HackCoverageChecker(languageClient).start(context);
    }
  }

  private showRestartingStatus(): void {
    this.status.text = "$(sync~spin) Hack LSP";
    this.status.tooltip = "Restarting Hack language server...";
    this.status.backgroundColor = undefined;
    this.status.command = undefined;
    this.status.show();
  }

  /** Attempt to automatically restart the Hack language server and client periodically. */
  private async restart(): Promise<void> {
    this.showRestartingStatus();

    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;

    let restartAttempts = 0;
    for await (const _ of setInterval(10_000)) {
      restartAttempts++;
      try {
        await hh_client.start();
        await this.languageClient?.restart();

        vscode.window.showInformationMessage(
          "Hack language server successfully restarted.",
        );

        this.status.text = this.versionText;
        this.status.tooltip = undefined;
        break;
      } catch (_e) {
        if (restartAttempts >= LSPHackTypeChecker.MAX_RESTART_ATTEMPTS) {
          this.status.text = "$(error) Hack LSP";
          this.status.tooltip =
            "Hack language server failed to restart after multiple attempts. Click to try again.";
          this.status.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
          );
          this.status.command = "hack.restartLSP";
          this.status.show();
          vscode.window.showErrorMessage(
            `Hack language server failed to restart after ${LSPHackTypeChecker.MAX_RESTART_ATTEMPTS} attempts.`,
          );
          break;
        }
      }
    }

    this.isRestarting = false;
  }

  private static handleDiagnostics(
    uri: vscode.Uri,
    diagnostics: vscode.Diagnostic[],
    next: HandleDiagnosticsSignature,
    status: vscode.StatusBarItem,
  ) {
    // If the Hack LSP loses connectivity with hh_server, it publishes a special custom diagnostic event. Rather than
    // show it as a regular error, we instead capture it and add a more prominent status bar indicator instead.
    if (
      diagnostics.length > 0 &&
      diagnostics[0].source === "hh_server" &&
      diagnostics[0].message.startsWith("hh_server isn't running")
    ) {
      status.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
      status.text = "$(error) Hack LSP";
      status.tooltip =
        "Hack Language Server disconnected. Language features will be unavailable. Click to restart.";
      status.command = "hack.restartLSP";
      status.show();
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

  private getVersionText(version: hack.Version): string {
    const hhvmVersion = version.commit.split("-").pop();
    let statusText = hhvmVersion ? `HHVM ${hhvmVersion}` : "HHVM";
    if (config.remoteEnabled && config.remoteType === "ssh") {
      statusText += " (Remote)";
    } else if (config.remoteEnabled && config.remoteType === "docker") {
      statusText += " (Docker)";
    }
    return statusText;
  }
}
