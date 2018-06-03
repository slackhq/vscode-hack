/**
 * @file VS Code diagnostics integration with Hack typechecker.
 */

import * as vscode from 'vscode';
import * as hh_client from './proxy';
import * as utils from './Utils';

export class HackTypeChecker {
    private hhvmTypeDiag: vscode.DiagnosticCollection;

    constructor(hhvmTypeDiag: vscode.DiagnosticCollection) {
        this.hhvmTypeDiag = hhvmTypeDiag;
    }

    public async run() {
        const typecheckResult = await hh_client.check();
        this.hhvmTypeDiag.clear();

        if (!typecheckResult || typecheckResult.passed) {
            return;
        }

        const diagnosticMap: Map<vscode.Uri, vscode.Diagnostic[]> = new Map();
        typecheckResult.errors.forEach(error => {

            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(
                    new vscode.Position(error.message[0].line - 1, error.message[0].start - 1),
                    new vscode.Position(error.message[0].line - 1, error.message[0].end)),
                `${error.message[0].descr} [${error.message[0].code}]`,
                vscode.DiagnosticSeverity.Error);

            diagnostic.code = error.message[0].code;
            diagnostic.source = 'Hack';

            const relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
            for (let i = 1; i < error.message.length; i++) {
                relatedInformation.push(
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(
                            utils.mapToWorkspaceUri(error.message[i].path),
                            new vscode.Range(
                                new vscode.Position(error.message[i].line - 1, error.message[i].start - 1),
                                new vscode.Position(error.message[i].line - 1, error.message[i].end)
                            )),
                        error.message[i].descr));
            }
            diagnostic.relatedInformation = relatedInformation;

            const file = utils.mapToWorkspaceUri(error.message[0].path);
            const cachedFileDiagnostics = diagnosticMap.get(file);
            if (cachedFileDiagnostics) {
                cachedFileDiagnostics.push(diagnostic);
            } else {
                diagnosticMap.set(file, [diagnostic]);
            }
        });
        diagnosticMap.forEach((diags, file) => {
            this.hhvmTypeDiag.set(file, diags);
        });
    }
}
