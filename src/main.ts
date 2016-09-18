/**
 * @file Manages the configuration settings for the widget. 
 */

'use strict';

import * as providers from './providers';
import { HackTypeChecker } from './typechecker';
import * as vscode from 'vscode';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    const HACK_MODE: vscode.DocumentFilter = { language: 'hack', scheme: 'file' };

    // register language functionality providers
    context.subscriptions.push(vscode.languages.registerHoverProvider(HACK_MODE, new providers.HackHoverProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(HACK_MODE, new providers.HackDocumentSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentHighlightProvider(HACK_MODE, new providers.HackDocumentHighlightProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(HACK_MODE, new providers.HackCompletionItemProvider(), '$', '>'));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(HACK_MODE, new providers.HackDocumentFormattingEditProvider()));
    // context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(HACK_MODE, new providers.HackDocumentRangeFormattingEditProvider()));
    // context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(HACK_MODE, new providers.HackSignatureHelpProvider(), '('));

    // create typechecker and run on file save
    const hhvmDiag = vscode.languages.createDiagnosticCollection('hhvm');
    context.subscriptions.push(hhvmDiag);
    const typechecker = new HackTypeChecker(hhvmDiag);
    vscode.workspace.onDidSaveTextDocument(document => {
        typechecker.run();
    });

    // also run the typechecker when the workspace is loaded for the first time
    typechecker.run();

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension \"vscode-hack\" is now active!');

}

// this method is called when your extension is deactivated
export function deactivate() {
}
