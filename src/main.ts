/**
 * @file Entry point for VS Code Hack extension.
 */

import * as vscode from 'vscode';
import * as config from './Config';
import { HackCoverageChecker } from './coveragechecker';
import * as hh_client from './proxy';
import { LegacyHackTypeChecker } from './LegacyHackTypeChecker';
import { LSPHackTypeChecker } from './LSPHackTypeChecker';
import { LSPHHASTLint } from './LSPHHASTLint';


export async function activate(context: vscode.ExtensionContext) {

    // check if a compatible verison of hh_client is installed, or show an error message and deactivate extension typecheck & intellisense features
    const version = await hh_client.version();
    if (!version) {
        vscode.window.showErrorMessage(
            `Invalid hh_client executable: '${config.clientPath}'. Please ensure that HHVM is correctly installed or configure an alternate hh_client path in workspace settings.`
        );
        return;
    }

    let services: Promise<void>[] = [];

    // create coverage checker and run on file open & save, if enabled in settings
    if (config.enableCoverageCheck) {
        services.push(new HackCoverageChecker().start(context));
    }

    services.push(LSPHHASTLint.startIfConfiguredAndEnabled(context));

    if (LSPHackTypeChecker.isSupported(version) && config.useLanguageServer) {
        services.push((new LSPHackTypeChecker(context)).run());
    } else {
        services.push((new LegacyHackTypeChecker(context)).run());
    }

    await Promise.all(services);

}

export function deactivate() {
    // nothing to clean up
}
