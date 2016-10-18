/**
 * @file Manages the configuration settings for the widget. 
 */

'use strict';

import { HackCoverageChecker } from './coveragechecker';
import * as providers from './providers';
import * as hh_client from './proxy';
import { HackTypeChecker } from './typechecker';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    const HACK_MODE: vscode.DocumentFilter = { language: 'hack', scheme: 'file' };

    // start local hhvm server if it isn't running already, or show an error message and deactivate the extension if unable to do so 
    if (!hh_client.start()) {
        const hhClient = vscode.workspace.getConfiguration('hack').get('clientPath'); // tslint:disable
        if (hhClient) { 
            vscode.window.showErrorMessage('Invalid `hh_client` executable: ' + hhClient + '. Please configure correct path and reload your workspace.');
        } else {
            vscode.window.showErrorMessage('Couldn\'t find `hh_client` executable in path. Please ensure that HHVM is correctly installed and reload your workspace.');
        }
        return;
    }

    // register language functionality providers
    context.subscriptions.push(vscode.languages.registerHoverProvider(HACK_MODE, new providers.HackHoverProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(HACK_MODE, new providers.HackDocumentSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider(HACK_MODE, new providers.HackDocumentHighlightProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(HACK_MODE, new providers.HackCompletionItemProvider(), '$', '>', ':'));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(HACK_MODE, new providers.HackDocumentFormattingEditProvider()));
    context.subscriptions.push(vscode.languages.registerReferenceProvider(HACK_MODE, new providers.HackReferenceProvider()));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(HACK_MODE, new providers.HackDefinitionProvider()));

    // create typechecker and run on file save
    const hhvmTypeDiag: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('hack_typecheck');
    const typechecker = new HackTypeChecker(hhvmTypeDiag);
    context.subscriptions.push(hhvmTypeDiag);

    // create coverage checker and run on file open & save
    const coverageStatus: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    const hhvmCoverDiag: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('hack_coverage');
    const coveragechecker = new HackCoverageChecker(coverageStatus, hhvmCoverDiag);
    context.subscriptions.push(hhvmCoverDiag);
    context.subscriptions.push(coverageStatus);
    context.subscriptions.push(vscode.commands.registerCommand('hack.toggleCoverageHighlight', () => { coveragechecker.toggle() }));

    // also run the type & coverage checkers when the workspace is loaded for the first time
    typechecker.run();
    vscode.workspace.textDocuments.forEach(document => {
        coveragechecker.run(document, true);
    });

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension \"vscode-hack\" is now active!');
}

export function deactivate() {
}
