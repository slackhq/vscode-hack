/**
 * Loads values from VS Code config. It is currently only read at extension launch,
 * but config change watchers can be added here if needed.
 */

import * as vscode from "vscode";

const hackConfig = vscode.workspace.getConfiguration("hack");

// tslint:disable-next-line:no-non-null-assertion
export const localWorkspacePath =
  vscode.workspace.workspaceFolders![0].uri.fsPath;

export let clientPath = hackConfig.get<string>("clientPath") || "hh_client";
clientPath = clientPath.replace("${workspaceFolder}", localWorkspacePath);

export const enableCoverageCheck = hackConfig.get<boolean>(
  "enableCoverageCheck",
  true,
);
export const useLanguageServer = hackConfig.get<boolean>(
  "useLanguageServer",
  true,
);
export const useHhast = hackConfig.get<boolean>("useHhast", true);
export const hhastLintMode: "whole-project" | "open-files" = hackConfig.get(
  "hhastLintMode",
  "whole-project",
);
export const hhastPath =
  hackConfig.get<string>("hhastPath") || "/vendor/bin/hhast-lint";
export const hhastArgs = hackConfig.get<string[]>("hhastArgs", []);

export const remoteEnabled = hackConfig.get<boolean>("remote.enabled", false);
export const remoteType: "ssh" | "docker" | undefined = hackConfig.get(
  "remote.type",
  undefined,
);
export const remoteWorkspacePath = hackConfig.get<string>(
  "remote.workspacePath",
);
export const sshHost = hackConfig.get<string>("remote.ssh.host", "");
export const sshArgs = hackConfig.get<string[]>("remote.ssh.args", []);
export const dockerContainerName = hackConfig.get<string>(
  "remote.docker.containerName",
  "",
);

// Prompt to reload workspace on certain configuration updates
vscode.workspace.onDidChangeConfiguration(async (event) => {
  if (event.affectsConfiguration("hack.remote")) {
    const selection = await vscode.window.showInformationMessage(
      "Please reload your workspace to apply the latest Hack configuration changes.",
      { modal: true },
      "Reload",
    );
    if (selection === "Reload") {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  }
});
