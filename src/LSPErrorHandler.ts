import * as vscode from "vscode";
import {
  CloseAction,
  CloseHandlerResult,
  ErrorAction,
  ErrorHandler,
  ErrorHandlerResult,
  Message,
} from "vscode-languageclient";
import * as hh_client from "./proxy";

export class HackLSPErrorHandler implements ErrorHandler {
  private readonly restarts: number[];
  private restartedLSP: boolean;

  constructor() {
    this.restarts = [];
    this.restartedLSP = false;
  }

  public error(
    _error: Error,
    _message: Message,
    count: number
  ): ErrorHandlerResult {
    if (count && count <= 3) {
      return { action: ErrorAction.Continue };
    }
    return { action: ErrorAction.Shutdown };
  }

  public async closed(): Promise<CloseHandlerResult> {
    this.restarts.push(Date.now());
    if (this.restarts.length <= 4) {
      return { action: CloseAction.Restart };
    } else {
      const diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
      if (diff <= 3 * 60 * 1000) {
        if (!this.restartedLSP) {
          this.restartedLSP = true;
          this.restarts.shift();

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: `Running Hack typechecker`,
            },
            async () => {
              return hh_client.start();
            }
          );

          return { action: CloseAction.Restart };
        } else {
          return {
            action: CloseAction.DoNotRestart,
            message: "",
          };
        }
      } else {
        this.restarts.shift();
        return { action: CloseAction.Restart };
      }
    }
  }
}
