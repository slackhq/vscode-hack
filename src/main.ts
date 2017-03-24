/**
 * @file Entry point for VS Code Hack extension.
 */

'use strict';

import * as vscode from 'vscode';
import { HackCoverageChecker } from './coveragechecker';
import * as providers from './providers';
import * as hh_client from './proxy';
import { HackTypeChecker } from './typechecker';

export async function activate(context: vscode.ExtensionContext) {

    const HACK_MODE: vscode.DocumentFilter = { language: 'hack', scheme: 'file' };

    // start local hhvm server if it isn't running already, or show an error message and deactivate extension typecheck & intellisense features if unable to do so
    const hhClient = vscode.workspace.getConfiguration('hack').get('clientPath'); // tslint:disable-line
    const startCode = hh_client.start((hhClient === null) ? 'hh_client' : String(hhClient));
    if (!startCode) {
        if (hhClient) {
            vscode.window.showErrorMessage('Invalid hh_client executable: \'' + hhClient + '\'. Please configure a valid path and reload your workspace.');
        } else {
            vscode.window.showErrorMessage('Couldn\'t find hh_client executable in path. Please ensure that HHVM is correctly installed and reload your workspace.');
        }
        return;
    }

    // register language functionality providers
    context.subscriptions.push(vscode.languages.registerHoverProvider(HACK_MODE, new providers.HackHoverProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(HACK_MODE, new providers.HackDocumentSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new providers.HackWorkspaceSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider(HACK_MODE, new providers.HackDocumentHighlightProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(HACK_MODE, new providers.HackCompletionItemProvider(), '$', '>', ':', '\\'));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(HACK_MODE, new providers.HackDocumentFormattingEditProvider()));
    context.subscriptions.push(vscode.languages.registerReferenceProvider(HACK_MODE, new providers.HackReferenceProvider()));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(HACK_MODE, new providers.HackDefinitionProvider()));

    // create typechecker and run on file save
    const hhvmTypeDiag: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('hack_typecheck');
    const typechecker = new HackTypeChecker(hhvmTypeDiag);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => { typechecker.run(); }));
    context.subscriptions.push(hhvmTypeDiag);

    // create coverage checker and run on file open & save
    const coverageStatus: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    const hhvmCoverDiag: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('hack_coverage');
    const coveragechecker = new HackCoverageChecker(coverageStatus, hhvmCoverDiag);
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => { coveragechecker.run(document, false); }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => { hhvmCoverDiag.delete(vscode.Uri.file(document.fileName)); }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
        coverageStatus.hide();
        if (vscode.window.activeTextEditor) {
            coveragechecker.run(vscode.window.activeTextEditor.document, true);
        }
    }));
    context.subscriptions.push(hhvmCoverDiag);
    context.subscriptions.push(coverageStatus);
    context.subscriptions.push(vscode.commands.registerCommand('hack.toggleCoverageHighlight', () => { coveragechecker.toggle(); }));

    // also run the type & coverage checkers when the workspace is loaded for the first time
    await typechecker.run();
    for (const document of vscode.workspace.textDocuments) {
        await coveragechecker.run(document, true);
    }
}

export function deactivate() {
    // nothing to clean up
}
