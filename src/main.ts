/**
 * @file Entry point for VS Code Hack extension.
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import * as config from './Config';
import { HackCoverageChecker } from './coveragechecker';
import * as providers from './providers';
import * as hh_client from './proxy';
import * as suppressions from './suppressions';
import { HackTypeChecker } from './typechecker';

export async function activate(context: vscode.ExtensionContext) {

    // check if a compatible verison of hh_client is installed, or show an error message and deactivate extension typecheck & intellisense features
    const version = await hh_client.version();
    if (!version) {
        vscode.window.showErrorMessage(
            `Invalid hh_client executable: '${config.hhClient}'. Please ensure that HHVM is correctly installed or configure an alternate hh_client path in workspace settings.`
        );
        return;
    }

    if (version.api_version >= 5 && config.useLanguageServer) {
        const languageClient = new LanguageClient('Hack Language Server', { command: config.hhClient, args: ['lsp'] }, { documentSelector: ['hack'] });
        context.subscriptions.push(languageClient.start());
        return;
    }

    // register language functionality providers
    const HACK_MODE: vscode.DocumentFilter = { language: 'hack', scheme: 'file' };
    context.subscriptions.push(vscode.languages.registerHoverProvider(HACK_MODE, new providers.HackHoverProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(HACK_MODE, new providers.HackDocumentSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new providers.HackWorkspaceSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider(HACK_MODE, new providers.HackDocumentHighlightProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(HACK_MODE, new providers.HackCompletionItemProvider(), '$', '>', ':', '\\'));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(HACK_MODE, new providers.HackDocumentFormattingEditProvider()));
    context.subscriptions.push(vscode.languages.registerReferenceProvider(HACK_MODE, new providers.HackReferenceProvider()));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(HACK_MODE, new providers.HackDefinitionProvider()));
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(HACK_MODE, new providers.HackCodeActionProvider()));

    // add command to add an error suppression comment
    context.subscriptions.push(vscode.commands.registerCommand('hack.suppressError', suppressions.suppressError));

    // create typechecker and run when workspace is first loaded and on every file save
    const hhvmTypeDiag: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('hack_typecheck');
    const typechecker = new HackTypeChecker(hhvmTypeDiag);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => { typechecker.run(); }));
    context.subscriptions.push(hhvmTypeDiag);
    await typechecker.run();

    // create coverage checker and run on file open & save, if enabled in settings
    if (config.enableCoverageCheck) {
        await new HackCoverageChecker().start(context);
    }
}

export function deactivate() {
    // nothing to clean up
}
