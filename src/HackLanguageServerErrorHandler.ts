import {
  CloseAction,
  CloseHandlerResult,
  ErrorAction,
  ErrorHandler,
  ErrorHandlerResult,
  Message,
} from "vscode-languageclient";
import { setInterval } from "node:timers/promises";
import * as vscode from "vscode";

import { HackConfig } from "./Config";
import * as hh_client from "./proxy";
import { HackLanguageServerStatus } from "./HackLanguageServerStatus";

export class HackLanguageServerErrorHandler implements ErrorHandler {
  private static readonly MAX_RESTART_ATTEMPTS = 30;

  constructor(
    private status: HackLanguageServerStatus,
    private config: HackConfig,
    private log: vscode.LogOutputChannel,
  ) {}

  error(
    _error: Error,
    _message: Message | undefined,
    _count: number | undefined,
  ): ErrorHandlerResult {
    return { action: ErrorAction.Continue };
  }

  /** VSCode error handler for language server errors that tries to restart the LS several times before restarting the client. */
  async closed(): Promise<CloseHandlerResult> {
    vscode.window.showErrorMessage(
      "Hack language server exited unexpectedly. It will be automatically restarted.",
    );

    // If the language server was terminated because hh_client itself is unavailable,
    // e.g. because the backing Docker container was terminated, we need to wait until it is up again.
    // So avoid yielding back to VSCode until we know hh_client is available, otherwise language server startup will error.
    if (await this.tryToRunHHClient()) {
      return {
        action: CloseAction.Restart,
      };
    }

    return {
      action: CloseAction.DoNotRestart,
      message: `Hack language server failed to restart after ${HackLanguageServerErrorHandler.MAX_RESTART_ATTEMPTS} attempts. Click the status item to try again.`,
    };
  }

  /** Try to run hh_client up to MAX_RESTART_ATTEMPTS with a delay between each attempt. */
  async tryToRunHHClient(): Promise<boolean> {
    // Try an immediate restart first.
    if (await this.runHHClientOnce()) {
      return true;
    }

    let restartAttempts = 1;

    // If the language server was terminated because hh_client itself is unavailable,
    // e.g. because the backing Docker container was terminated, we need to wait until it is up again.
    // So avoid yielding back to VSCode until we know hh_client is available, otherwise language server startup will error.
    for await (const _ of setInterval(10_000)) {
      if (await this.runHHClientOnce()) {
        // hh_client works, it's safe to let VSCode try to run it to start the language server
        break;
      }

      if (
        restartAttempts >= HackLanguageServerErrorHandler.MAX_RESTART_ATTEMPTS
      ) {
        this.status.showError(
          "Hack language server failed to restart after multiple attempts. Click to try again.",
          "hack.restartLSP",
        );

        return false;
      }

      restartAttempts++;
    }

    return true;
  }

  /** Attempt to run hh_client and return whether it succeeded. */
  private async runHHClientOnce(): Promise<boolean> {
    this.status.showProgress("Restarting Hack language server...");

    try {
      await hh_client.start(this.config, this.log);

      this.status.showSuccess();

      vscode.window.showInformationMessage(
        "Hack language server successfully restarted.",
      );

      return true;
    } catch (e) {
      this.log.error(`Failed to run hh_client: `, e);
      return false;
    }
  }
}
