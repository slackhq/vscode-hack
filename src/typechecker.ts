/**
 * @file Extension providers.
 */

'use strict';

import * as hh_client from './proxy';
import * as vscode from 'vscode';

export class HackTypeChecker {
    constructor(private diagnosticCollection: vscode.DiagnosticCollection) { }

    public run(): Thenable<void> {
        return hh_client.check().then(value => {
            this.diagnosticCollection.clear();
            if (!value || value.passed) {
                return;
            }

            const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
            value.errors.forEach(error => {
                let fullMessage = '';
                error.message.forEach(messageUnit => {
                    fullMessage = fullMessage + messageUnit.descr + '\n';
                });
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                        new vscode.Position(error.message[0].line - 1, error.message[0].start - 1),
                        new vscode.Position(error.message[0].line - 1, error.message[0].end)),
                    fullMessage,
                    vscode.DiagnosticSeverity.Error);
                // diagnostic.source = 'HHVM';
                const file = error.message[0].path;
                if (diagnosticMap.has(file)) {
                    diagnosticMap.get(file).push(diagnostic);
                } else {
                    diagnosticMap.set(file, [diagnostic]);
                }
            });
            diagnosticMap.forEach((diags, file) => {
                this.diagnosticCollection.set(vscode.Uri.file(file), diags);
            });
        });
    }
}
