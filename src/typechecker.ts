/**
 * @file VS Code diagnostics integration with Hack typechecker.
 */

'use strict';

import * as vscode from 'vscode';
import * as hh_client from './proxy';

// tslint:disable-next-line:export-name
export class HackTypeChecker {
    constructor(private hhvmTypeDiag: vscode.DiagnosticCollection) {}

    public async run() {
        const typecheckResult = await hh_client.check();
        this.hhvmTypeDiag.clear();

        if (!typecheckResult || typecheckResult.passed) {
            return;
        }

        const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
        typecheckResult.errors.forEach(error => {
            let fullMessage = '';
            error.message.forEach(messageUnit => {
                fullMessage = fullMessage + messageUnit.descr + ' [' + messageUnit.code + ']' + '\n';
            });
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(
                    new vscode.Position(error.message[0].line - 1, error.message[0].start - 1),
                    new vscode.Position(error.message[0].line - 1, error.message[0].end)),
                fullMessage,
                vscode.DiagnosticSeverity.Error);
            diagnostic.source = 'Hack';
            const file = error.message[0].path;
            if (diagnosticMap.has(file)) {
                diagnosticMap.get(file).push(diagnostic);
            } else {
                diagnosticMap.set(file, [diagnostic]);
            }
        });
        diagnosticMap.forEach((diags, file) => {
            this.hhvmTypeDiag.set(vscode.Uri.file(file), diags);
        });
    }
}
