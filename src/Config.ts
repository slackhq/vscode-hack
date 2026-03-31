/**
 * Loads values from VS Code config. It is currently only read at extension launch,
 * but config change watchers can be added here if needed.
 */

import * as vscode from "vscode";

export class HackConfig {
  readonly clientPath: string;
  readonly enableCoverageCheck: boolean;
  readonly useHhast: boolean;
  readonly hhastLintMode: "whole-project" | "open-files";
  readonly hhastPath: string;
  readonly hhastArgs: string[];
  readonly localWorkspacePath: string;
  readonly remoteEnabled: boolean;
  readonly remoteType: "ssh" | "docker" | undefined;
  readonly remoteWorkspacePath: string | undefined;
  readonly sshHost: string;
  readonly sshArgs: string[];
  readonly dockerContainerName: string;

  constructor(
    hackConfig: vscode.WorkspaceConfiguration,
    workspaceFolderPath: string,
  ) {
    const clientPath = hackConfig.get<string>("clientPath") || "hh_client";
    this.clientPath = clientPath.replace(
      "${workspaceFolder}",
      workspaceFolderPath,
    );
    this.localWorkspacePath = workspaceFolderPath;

    this.enableCoverageCheck = hackConfig.get<boolean>(
      "enableCoverageCheck",
      true,
    );
    this.useHhast = hackConfig.get<boolean>("useHhast", true);
    this.hhastLintMode = hackConfig.get("hhastLintMode", "whole-project");
    this.hhastPath =
      hackConfig.get<string>("hhastPath") || "/vendor/bin/hhast-lint";
    this.hhastArgs = hackConfig.get<string[]>("hhastArgs", []);

    this.remoteEnabled = hackConfig.get<boolean>("remote.enabled", false);
    this.remoteType = hackConfig.get("remote.type", undefined);
    this.remoteWorkspacePath = hackConfig.get<string>("remote.workspacePath");
    this.sshHost = hackConfig.get<string>("remote.ssh.host", "");
    this.sshArgs = hackConfig.get<string[]>("remote.ssh.args", []);
    this.dockerContainerName = hackConfig.get<string>(
      "remote.docker.containerName",
      "",
    );
  }
}

/** Factory for production use */
export function createHackConfig(): HackConfig {
  return new HackConfig(
    vscode.workspace.getConfiguration("hack"),
    vscode.workspace.workspaceFolders![0].uri.fsPath,
  );
}
