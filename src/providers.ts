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
                if (value.startsWith('(function')) {
                    value = value.slice(1, value.length - 1);
                }
                const formattedMessage: vscode.MarkedString = { language: 'hack', value: value };
                return new vscode.Hover(formattedMessage);
            }
        });
    }
}

const symbolArray = [
    { key: 'function', value: vscode.SymbolKind.Function },
    { key: 'method', value: vscode.SymbolKind.Method },
    { key: 'class', value: vscode.SymbolKind.Class },
    { key: 'abstract class', value: vscode.SymbolKind.Class },
    { key: 'static method', value: vscode.SymbolKind.Method },
    { key: 'constant', value: vscode.SymbolKind.Constant },
    { key: 'interface', value: vscode.SymbolKind.Interface }
];

const symbolMap = new Map(
    symbolArray.map<[string, vscode.SymbolKind]>(x => [x.key, x.value])
);

const getRange = (line: number, charStart: number, charEnd: number): vscode.Range => {
    return new vscode.Range(
        new vscode.Position(line - 1, charStart - 1),
        new vscode.Position(line - 1, charEnd - 1));
};

const getSymbolKind = (symbolType: string): vscode.SymbolKind => {
    return symbolMap.has(symbolType) ? symbolMap.get(symbolType) : vscode.SymbolKind.Null;
};

export class HackDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return hh_client.outline(document.getText()).then(value => {
            const symbols: vscode.SymbolInformation[] = [];
            value.forEach(element => {
                let name = element.name.split('\\').pop();
                const symbolKind = getSymbolKind(element.type);
                let container: string = null;

                switch (symbolKind) {
                    case vscode.SymbolKind.Method:
                        container = element.name.slice(0, element.name.indexOf('::'));
                        name = element.name.slice(element.name.indexOf('::') + 2, element.name.length);
                        break;
                    default:
                        if (element.name.includes('\\')) {
                            container = element.name.slice(0, element.name.lastIndexOf('\\'));
                        }
                        break;
                }
                const range = getRange(element.line, element.char_start, element.char_end);
                symbols.push(new vscode.SymbolInformation(name, symbolKind, range, null, container));
            });
            return symbols;
        });
    }
}

export class HackWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
    public provideWorkspaceSymbols(query: string, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return hh_client.search(query).then(value => {
            const symbols: vscode.SymbolInformation[] = [];
            value.forEach(element => {
                const name = element.name.split('\\').pop();
                let desc = element.desc;
                if (desc.includes(' in ')) {
                    desc = desc.slice(0, element.desc.indexOf(' in '));
                }
                const kind = getSymbolKind(desc);
                const uri: vscode.Uri = vscode.Uri.file(element.filename);
                const container = element.scope || (element.name.includes('\\') ? element.name.slice(0, element.name.lastIndexOf('\\')) : null);
                const range = getRange(element.line, element.char_start, element.char_end);
                symbols.push(new vscode.SymbolInformation(name, kind, range, uri, container));
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
                let label: string = element.name.split('\\').pop();
                let labelType: string = element.type;
                let kind = vscode.CompletionItemKind.Class;
                if (label.startsWith('$')) {
                    label = label.slice(1);
                    kind = vscode.CompletionItemKind.Variable;
                    labelType = labelType.split('\\').pop();
                } else if (labelType.startsWith('(function')) {
                    // If the name and return type matches then it is a constructor
                    if (element.name === element.func_details.return_type) {
                        kind = vscode.CompletionItemKind.Constructor;
                    } else {
                        kind = vscode.CompletionItemKind.Method;
                    }
                    const typeSplit = labelType.slice(1, labelType.length - 1).split(':');
                    labelType = typeSplit[0] + ': ' + typeSplit[1].split('\\').pop();
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

export class HackReferenceProvider implements vscode.ReferenceProvider {
    public provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken)
        : Thenable<vscode.Location[]> {
        const text = document.getText();
        return hh_client.findLvarRefs(text, position.line + 1, position.character + 1).then(lvarRefs => {
            return hh_client.ideFindRefs(text, position.line + 1, position.character + 1).then(findRefs => {
                return hh_client.ideHighlightRefs(text, position.line + 1, position.character + 1).then(highlightRefs => {
                    const locations: vscode.Location[] = [];
                    lvarRefs.positions.forEach(match => {
                        const location = new vscode.Location(
                            vscode.Uri.file(document.fileName),
                            new vscode.Range(
                                new vscode.Position(match.line - 1, match.char_start - 1),
                                new vscode.Position(match.line - 1, match.char_end)));
                        locations.push(location);
                    });
                    findRefs.forEach(ref => {
                        const location = new vscode.Location(
                            vscode.Uri.file(ref.filename),
                            new vscode.Range(
                                new vscode.Position(ref.line - 1, ref.char_start - 1),
                                new vscode.Position(ref.line - 1, ref.char_end)));
                        locations.push(location);
                    });
                    highlightRefs.forEach(ref => {
                        const location = new vscode.Location(
                            vscode.Uri.file(document.fileName),
                            new vscode.Range(
                                new vscode.Position(ref.line - 1, ref.char_start - 1),
                                new vscode.Position(ref.line - 1, ref.char_end)));
                        locations.push(location);
                    });

                    return locations;
                });
            });
        });
    }
}

export class HackDefinitionProvider implements vscode.DefinitionProvider {
    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken)
        : Thenable<vscode.Definition> {
        const text = document.getText();
        return hh_client.ideGetDefinition(text, position.line + 1, position.character + 1).then(value => {
            const definition: vscode.Location[] = [];
            value.forEach(element => {
                if (element.definition_pos != null) {
                    const location: vscode.Location = new vscode.Location(
                        vscode.Uri.file(element.definition_pos.filename || document.fileName),
                        new vscode.Range(
                            new vscode.Position(element.definition_span.line_start - 1, element.definition_span.char_start - 1),
                            new vscode.Position(element.definition_span.line_end - 1, element.definition_span.char_end)));
                    definition.push(location);
                }
            });
            return definition;
        });
    }
}
