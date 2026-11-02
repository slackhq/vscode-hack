/**
 * @file Document formatting via a user-configured formatter executable
 */

import * as ps from "child_process";
import * as vscode from "vscode";
import { HackConfig } from "./Config";

/**
 * Formats a document by piping its contents through `hack.formatterPath`.
 * Resolves to `undefined` (no changes) if the formatter fails or is cancelled.
 */
export async function formatDocument(
  config: HackConfig,
  document: vscode.TextDocument,
  log: vscode.LogOutputChannel,
  token: vscode.CancellationToken,
): Promise<vscode.TextEdit[] | undefined> {
  const formatterPath = config.formatterPath;
  if (!formatterPath) {
    return undefined;
  }

  const text = document.getText();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: vscode.TextEdit[] | undefined) => {
      if (!settled) {
        settled = true;
        cancellation.dispose();
        resolve(result);
      }
    };
    const fail = (reason: string) => {
      log.error(`Hack formatter '${formatterPath}' failed: ${reason}`);
      vscode.window.showErrorMessage(
        `Hack formatter failed: ${reason.split("\n")[0]}`,
      );
      finish(undefined);
    };

    const child = ps.spawn(formatterPath, config.formatterArgs, {
      cwd: config.localWorkspacePath,
    });

    const cancellation = token.onCancellationRequested(() => {
      child.kill();
      finish(undefined);
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

    child.on("error", (err) => fail(err.message));
    child.on("close", (code) => {
      if (code !== 0) {
        const errOutput = Buffer.concat(stderr).toString().trim();
        fail(`exited with code ${code}${errOutput ? `: ${errOutput}` : ""}`);
        return;
      }

      const formatted = Buffer.concat(stdout).toString();
      if (formatted === text) {
        finish([]);
        return;
      }

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length),
      );
      finish([vscode.TextEdit.replace(fullRange, formatted)]);
    });

    // Ignore EPIPE if the formatter exits without reading all of stdin;
    // the failure is reported via the exit code instead.
    child.stdin.on("error", () => {});
    child.stdin.end(text);
  });
}
