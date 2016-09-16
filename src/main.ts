'use strict';

import * as vscode from 'vscode';
import { HackHoverProvider, HackDocumentSymbolProvider } from './providers';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    
    let HACK_MODE: vscode.DocumentFilter = { language: 'hack', scheme: 'file' };

    context.subscriptions.push(vscode.languages.registerHoverProvider(HACK_MODE, new HackHoverProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(HACK_MODE, new HackDocumentSymbolProvider()))

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-hack" is now active!');

}

// this method is called when your extension is deactivated
export function deactivate() {
}