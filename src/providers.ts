/**
 * @file Extension providers.
 */

'use strict';

import * as hh_client from './proxy';
import * as vscode from 'vscode';

export class HackHoverProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        const startPosition = document.getWordRangeAtPosition(position).start;
        const line: number = startPosition.line + 1;
        const character: number = startPosition.character + 1;

        return hh_client.typeAtPos(document.fileName, line, character).then(value => {
            if (value) {
                const formattedMessage: vscode.MarkedString = { language: 'hack', value: value };
                return new vscode.Hover(formattedMessage);
            }
        });
    }
}

export class HackDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    private static symbolArray = [
        { key: 'function', value: vscode.SymbolKind.Function },
        { key: 'method', value: vscode.SymbolKind.Method },
        { key: 'class', value: vscode.SymbolKind.Class },
        { key: 'static method', value: vscode.SymbolKind.Method }
    ];

    private static symbolMap = new Map(
        HackDocumentSymbolProvider.symbolArray.map<[string, vscode.SymbolKind]>(x => [x.key, x.value])
    );

    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return hh_client.outline(document.getText()).then(value => {
            const symbols: vscode.SymbolInformation[] = [];
            value.forEach(element => {
                const fullName: string = element.name;
                const nameSplit = fullName.split('\\');
                let name: string = nameSplit[nameSplit.length - 1];
                const symbolKind = HackDocumentSymbolProvider.symbolMap.has(element.type)
                    ? HackDocumentSymbolProvider.symbolMap.get(element.type)
                    : vscode.SymbolKind.Null;
                let container: string = null;
                switch (symbolKind) {
                    case vscode.SymbolKind.Class:
                        if (fullName.includes('\\')) {
                            container = fullName.slice(0, fullName.lastIndexOf('\\'));
                        }
                        break;
                    case vscode.SymbolKind.Method:
                        container = name.slice(0, name.indexOf('::'));
                        name = name.slice(name.indexOf('::') + 2, name.length);
                        break;
                    default:
                        break;
                }
                const range = new vscode.Range(
                    new vscode.Position(element.line - 1, element.char_start - 1),
                    new vscode.Position(element.line - 1, element.char_end - 1));
                symbols.push(new vscode.SymbolInformation(name, symbolKind, range, null, container));
            });
            return symbols;
        });
    }
}

export class HackDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
    public provideDocumentHighlights(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.DocumentHighlight[]> {
        return hh_client.ideHighlightRefs(document.getText(), position.line + 1, position.character + 1).then(value => {
            const highlights: vscode.DocumentHighlight[] = [];
            value.forEach(element => {
                const line: number = element.line - 1;
                const charStart: number = element.char_start - 1;
                const charEnd: number = element.char_end;
                highlights.push(new vscode.DocumentHighlight(
                    new vscode.Range(new vscode.Position(line, charStart), new vscode.Position(line, charEnd)),
                    vscode.DocumentHighlightKind.Text));
            });
            return highlights;
        });
    }
}

export class HackCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.CompletionItem[]> {
        return hh_client.autoComplete(document.getText(), document.offsetAt(position)).then(value => {
            const completionItems: vscode.CompletionItem[] = [];
            value.forEach(element => {
                let label: string = element.name;
                let labelType: string = element.type;
                let kind = vscode.CompletionItemKind.Class;
                if (label.startsWith('$')) {
                    label = label.slice(1);
                    kind = vscode.CompletionItemKind.Variable;
                } else if (labelType.startsWith('(function')) {
                    labelType = labelType.slice(1, labelType.length - 1);
                    kind = vscode.CompletionItemKind.Method;
                } else if (labelType === 'class') {
                    kind = vscode.CompletionItemKind.Class;
                }
                const completionItem = new vscode.CompletionItem(label, kind);
                completionItem.detail = labelType;
                completionItems.push(completionItem);
            });
            return completionItems;
        });
    }
}

export class HackDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        const text: string = document.getText();
        return hh_client.format(text, 0, text.length).then(value => {
            if (value.internal_error || value.error_message) {
                return null;
            }
            const textEdit = vscode.TextEdit.replace(
                new vscode.Range(document.positionAt(0), document.positionAt(text.length)), value.result);
            return [textEdit];
        });
    };
}

// TODO: Fix
/*export class HackDocumentRangeFormattingEditProvider implements vscode.DocumentRangeFormattingEditProvider {
    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        const start: number = document.offsetAt(range.start) + 1;
        const end: number = document.offsetAt(range.end) - 1;
        console.log(document.getText(range));
        return hh_client.format(document.getText(), start, end).then(value => {
            if (value.internal_error || value.error_message) {
                return null;
            }
            console.log(value.result);
            const textEdit = vscode.TextEdit.replace(range, value.result);
            return [textEdit];
        });
    };
}*/
