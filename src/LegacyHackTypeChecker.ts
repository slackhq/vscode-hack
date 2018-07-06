/**
 * @file VS Code diagnostics integration with Hack typechecker by executing
 * `hh_client` each time
 */

import * as vscode from 'vscode';
import * as hh_client from './proxy';
import * as utils from './Utils';
import * as providers from './providers';
import * as suppressions from './suppressions';

export class LegacyHackTypeChecker {
    private hhvmTypeDiag: vscode.DiagnosticCollection;

    constructor(context: vscode.ExtensionContext) {
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
        this.hhvmTypeDiag = hhvmTypeDiag;
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => { this.run(); }));
        context.subscriptions.push(hhvmTypeDiag);
    }

    public async run(): Promise<void> {
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
