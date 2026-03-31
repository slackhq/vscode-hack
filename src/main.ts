/**
 * @file Entry point for VS Code Hack extension.
 */

import * as vscode from "vscode";
import { createHackConfig } from "./Config";
import { LSPHackTypeChecker } from "./LSPHackTypeChecker";
import { LSPHHASTLint } from "./LSPHHASTLint";
import * as hh_client from "./proxy";
import { HhvmDebugConfigurationProvider } from "./HhvmDebugConfigurationProvider";
import { HackLanguageServerErrorHandler } from "./HackLanguageServerErrorHandler";
import { HackLanguageServerStatus } from "./HackLanguageServerStatus";

export async function activate(context: vscode.ExtensionContext) {
  const config = createHackConfig();

  // Prompt to reload workspace on certain configuration updates
  context.subscriptions.push(
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
    }),
  );

  // check if a compatible verison of hh_client is installed, or show an error message and deactivate extension typecheck & intellisense features
  const version = await hh_client.version(config);
  if (!version) {
    let errMsg = `Invalid hh_client executable: '${config.clientPath}'. Please ensure that HHVM is correctly installed or configure an alternate hh_client path in workspace settings.`;

    if (config.remoteEnabled && config.remoteType === "ssh") {
      errMsg = `Unable to connect to remote Hack server, please ensure it is running, and restart VSCode.`;
    } else if (config.remoteEnabled && config.remoteType === "docker") {
      errMsg = `Unable to connect to the HHVM Docker container, please ensure the container and HHVM is running, and restart VSCode.`;
    }

    vscode.window.showErrorMessage(errMsg);
    return;
  }

  if (!LSPHackTypeChecker.IS_SUPPORTED(version)) {
    vscode.window.showErrorMessage(
      "The installed version of hh_client is too old and does not support LSP. Please upgrade HHVM to at least version 3.23.",
    );
    return;
  }

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1000,
  );
  context.subscriptions.push(statusBarItem);
  const serverStatus = new HackLanguageServerStatus(
    statusBarItem,
    config.remoteType ?? "",
    version,
  );
  const errorHandler = new HackLanguageServerErrorHandler(serverStatus, config);

  const services: Promise<void>[] = [];
  services.push(LSPHHASTLint.START_IF_CONFIGURED_AND_ENABLED(context, config));
  services.push(
    new LSPHackTypeChecker(context, config, serverStatus, errorHandler).run(),
  );

  vscode.debug.registerDebugConfigurationProvider(
    "hhvm",
    new HhvmDebugConfigurationProvider(config),
  );

  await Promise.all(services);
}

export function deactivate() {
  // nothing to clean up
}
