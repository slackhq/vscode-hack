/**
 * @file Entry point for VS Code Hack extension.
 */

import * as vscode from "vscode";
import * as config from "./Config";
import { LSPHackTypeChecker } from "./LSPHackTypeChecker";
import { LSPHHASTLint } from "./LSPHHASTLint";
import * as hh_client from "./proxy";
import { HhvmDebugConfigurationProvider } from "./HhvmDebugConfigurationProvider";

export async function activate(context: vscode.ExtensionContext) {
  // check if a compatible verison of hh_client is installed, or show an error message and deactivate extension typecheck & intellisense features
  const version = await hh_client.version();
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

  const services: Promise<void>[] = [];
  services.push(LSPHHASTLint.START_IF_CONFIGURED_AND_ENABLED(context));
  services.push(new LSPHackTypeChecker(context, version).run());

  vscode.debug.registerDebugConfigurationProvider(
    "hhvm",
    new HhvmDebugConfigurationProvider(),
  );

  await Promise.all(services);
}

export function deactivate() {
  // nothing to clean up
}
