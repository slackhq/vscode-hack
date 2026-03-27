/**
 * @file hh_client proxy
 */

import * as ps from "child_process";
import * as config from "./Config";
import * as remote from "./remote";
import * as hack from "./types/hack";

export async function version(): Promise<hack.Version | undefined> {
  try {
    return JSON.parse(await run(["--version"]));
  } catch {
    return undefined;
  }
}

export async function start(): Promise<string> {
  return run([]);
}

async function run(extraArgs: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
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
        if (!stdout) {
          // all hh_client --check output goes to stderr by default
          stdout = stderr;
        }

        const wasError = err !== null && err.code !== 0 && err.code !== 2;
        if (wasError) {
          // any hh_client failure other than typecheck errors
          console.error(`Hack: hh_client execution error: ${err}`);
          reject(stdout);
          return;
        }

        resolve(stdout);
      },
    );
  });
}
