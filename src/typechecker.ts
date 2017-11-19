/**
 * @file VS Code diagnostics integration with Hack typechecker.
 */

import * as vscode from 'vscode';
import * as config from './Config';
import * as hh_client from './proxy';

export class HackTypeChecker {
    private hhvmTypeDiag: vscode.DiagnosticCollection;

    constructor(hhvmTypeDiag: vscode.DiagnosticCollection) {
        this.hhvmTypeDiag = hhvmTypeDiag;
    }

    private static mapToWorkspacePath(fileName: string): string {
        if (config.workspace && vscode.workspace.rootPath) {
            return fileName.replace(config.workspace, vscode.workspace.rootPath);
        }
        return fileName;
    }

    public async run() {
        const typecheckResult = await hh_client.check();
        this.hhvmTypeDiag.clear();

        if (!typecheckResult || typecheckResult.passed) {
            return;
        }

        const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
        typecheckResult.errors.forEach(error => {
            let fullMessage = '';
            let code: number = 0;
            error.message.forEach(messageUnit => {
                if (code === 0) {
                    code = messageUnit.code;
                }
                fullMessage = `${fullMessage} ${messageUnit.descr} [${messageUnit.code}]\n`;
            });
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(
                    new vscode.Position(error.message[0].line - 1, error.message[0].start - 1),
                    new vscode.Position(error.message[0].line - 1, error.message[0].end)),
                fullMessage,
                vscode.DiagnosticSeverity.Error);
            diagnostic.code = code;
            diagnostic.source = 'Hack';
            const file = HackTypeChecker.mapToWorkspacePath(error.message[0].path);
            const cachedFileDiagnostics = diagnosticMap.get(file);
            if (cachedFileDiagnostics) {
                cachedFileDiagnostics.push(diagnostic);
            } else {
                diagnosticMap.set(file, [diagnostic]);
            }
        });
        diagnosticMap.forEach((diags, file) => {
            this.hhvmTypeDiag.set(vscode.Uri.file(file), diags);
        });
    }
}
