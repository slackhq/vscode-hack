/**
 * @file hh_client proxy
 */

import * as ps from "child_process";
import * as config from "./Config";
import * as remote from "./remote";
import * as hack from "./types/hack";

export async function version(): Promise<hack.Version | undefined> {
  return run(["--version"]);
}

/**
 * Hack client hangs if executed in lsp mode before running it standalone.
 */
export async function start(): Promise<hack.Version | undefined> {
  return run([]);
}

async function run(extraArgs: string[], stdin?: string): Promise<any> {
  return new Promise<any>((resolve, _) => {
    const workspacePath =
      config.remoteEnabled && config.remoteWorkspacePath
        ? config.remoteWorkspacePath
        : config.localWorkspacePath;
    const command = remote.getCommand(config.clientPath);
    const args = remote.getArgs(config.clientPath, [
      ...extraArgs,
      "--json",
      "--from",
      "vscode-hack",
      workspacePath,
    ]);
    const p = ps.execFile(
      command,
      args,
      { maxBuffer: 1024 * 1024 },
      (err: any, stdout, stderr) => {
        if (err !== null && err.code !== 0 && err.code !== 2) {
          // any hh_client failure other than typecheck errors
          console.error(`Hack: hh_client execution error: ${err}`);
          resolve(null);
        }
        if (!stdout) {
          // all hh_client --check output goes to stderr by default
          stdout = stderr;
        }
        try {
          const output = JSON.parse(stdout);
          resolve(output);
        } catch (parseErr) {
          console.error(`Hack: hh_client output error: ${parseErr}`);
          resolve(null);
        }
      },
    );
    if (stdin && p && p.stdin) {
      p.stdin.write(stdin);
      p.stdin.end();
    }
  });
}
