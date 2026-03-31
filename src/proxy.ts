/**
 * @file hh_client proxy
 */

import * as ps from "child_process";
import * as vscode from "vscode";
import { HackConfig } from "./Config";
import * as remote from "./remote";
import * as hack from "./types/hack";

export async function version(
  config: HackConfig,
  log: vscode.LogOutputChannel,
): Promise<hack.Version | undefined> {
  try {
    return JSON.parse(await run(config, log, ["--version"]));
  } catch {
    return undefined;
  }
}

export async function start(
  config: HackConfig,
  log: vscode.LogOutputChannel,
): Promise<string> {
  return run(config, log, []);
}

async function run(
  config: HackConfig,
  log: vscode.LogOutputChannel,
  extraArgs: string[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const workspacePath =
      config.remoteEnabled && config.remoteWorkspacePath
        ? config.remoteWorkspacePath
        : config.localWorkspacePath;
    const command = remote.getCommand(config, config.clientPath);
    const args = remote.getArgs(config, config.clientPath, [
      ...extraArgs,
      "--json",
      "--from",
      "vscode-hack",
      workspacePath,
    ]);
    ps.execFile(
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
          const errMsg = `hh_client execution error: ${err}, output: ${stdout}`;
          // any hh_client failure other than typecheck errors
          log.error(errMsg);
          reject(new Error(errMsg));
          return;
        }

        resolve(stdout);
      },
    );
  });
}
