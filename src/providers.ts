/**
 * @file Extension providers for intellisense features (hover, autocomplete, goto symbol etc.)
 */

import * as vscode from 'vscode';
import * as hh_client from './proxy';
import { OutlineResponse } from './types/hack';

export class HackHoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover> {
        const wordPosition = document.getWordRangeAtPosition(position);
        if (wordPosition) {
            const startPosition = wordPosition.start;
            const line: number = startPosition.line + 1;
            const character: number = startPosition.character + 1;

            let hoverType = await hh_client.typeAtPos(document.fileName, line, character);
            if (hoverType) {
                if (hoverType.startsWith('(function')) {
                    hoverType = hoverType.slice(1, hoverType.length - 1);
                }
                const formattedMessage: vscode.MarkedString = { language: 'hack', value: hoverType };
                return new vscode.Hover(formattedMessage);
            }
        }
        return undefined;
    }
}

const symbolArray = [
    { key: 'function', value: vscode.SymbolKind.Function },
    { key: 'method', value: vscode.SymbolKind.Method },
    { key: 'class', value: vscode.SymbolKind.Class },
    { key: 'const', value: vscode.SymbolKind.Constant },
    { key: 'interface', value: vscode.SymbolKind.Interface },
    { key: 'enum', value: vscode.SymbolKind.Enum },
    { key: 'trait', value: vscode.SymbolKind.Interface },
    { key: 'property', value: vscode.SymbolKind.Property }
];

const symbolMap = new Map(
    symbolArray.map<[string, vscode.SymbolKind]>(x => [x.key, x.value])
);

const getRange = (lineStart: number, lineEnd: number, charStart: number, charEnd: number): vscode.Range => {
    return new vscode.Range(
        new vscode.Position(lineStart - 1, charStart - 1),
        new vscode.Position(lineEnd - 1, charEnd - 1));
};

const getSymbolKind = (symbolType: string): vscode.SymbolKind => {
    return symbolMap.get(symbolType) || vscode.SymbolKind.Null;
};

const pushSymbols = (outline: OutlineResponse[], symbols: vscode.SymbolInformation[], container: string, indent: string) => {
    outline.forEach(element => {
        let name = element.name;
        const nameIndex = name.lastIndexOf('\\');
        if (nameIndex !== -1) {
            container = name.slice(0, nameIndex);
            name = name.slice(nameIndex + 1);
        }
        let symbolKind = getSymbolKind(element.kind);

        switch (symbolKind) {
            case vscode.SymbolKind.Method:
            case vscode.SymbolKind.Function:
                if (element.name === '__construct') {
                    symbolKind = vscode.SymbolKind.Constructor;
                }
                name += '()';
                break;
            default:
                break;
        }
        name = indent + name;
        const range = getRange(element.span.line_start, element.span.line_end, element.span.char_start, element.span.char_end);
        symbols.push(new vscode.SymbolInformation(name, symbolKind, range, undefined, container));

        // Check if element has any children, and recursively fetch them as well.
        // NOTE: Do DFS traversal here because we want the groups to be listed together.
        if (element.children && element.children.length > 0) {
            pushSymbols(element.children, symbols, name, `${indent}  `);
        }
    });
};

export class HackDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
        const outline = await hh_client.outline(document.getText());
        const symbols: vscode.SymbolInformation[] = [];
        pushSymbols(outline, symbols, '', '');
        return symbols;
    }
}

export class HackWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
    public async provideWorkspaceSymbols(query: string): Promise<vscode.SymbolInformation[]> {
        const searchResult = await hh_client.search(query);
        const symbols: vscode.SymbolInformation[] = [];
        searchResult.forEach(element => {
            const name = element.name.split('\\').pop();
            let desc = element.desc;
            if (desc.includes(' in ')) {
                desc = desc.slice(0, element.desc.indexOf(' in '));
            }
            const kind = getSymbolKind(desc);
            const uri: vscode.Uri = vscode.Uri.file(element.filename);
            const container = element.scope || (element.name.includes('\\') ? element.name.slice(0, element.name.lastIndexOf('\\')) : undefined);
            const range = getRange(element.line, element.line, element.char_start, element.char_end);
            symbols.push(new vscode.SymbolInformation(name, kind, range, uri, container));
        });
        return symbols;
    }
}

export class HackDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
    public async provideDocumentHighlights(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.DocumentHighlight[]> {
        const highlightResult = await hh_client.ideHighlightRefs(document.getText(), position.line + 1, position.character + 1);
        const highlights: vscode.DocumentHighlight[] = [];
        highlightResult.forEach(element => {
            const line: number = element.line - 1;
            const charStart: number = element.char_start - 1;
            const charEnd: number = element.char_end;
            highlights.push(new vscode.DocumentHighlight(
                new vscode.Range(new vscode.Position(line, charStart), new vscode.Position(line, charEnd)),
                vscode.DocumentHighlightKind.Text));
        });
        return highlights;
    }
}

export class HackCompletionItemProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const completionResult = await hh_client.autoComplete(document.getText(), document.offsetAt(position));
        const completionItems: vscode.CompletionItem[] = [];
        completionResult.forEach(element => {
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
                labelType = `${typeSplit[0]}: ${typeSplit[1].split('\\').pop()}`;
            } else if (labelType === 'class') {
                kind = vscode.CompletionItemKind.Class;
            }
            const completionItem = new vscode.CompletionItem(label, kind);
            completionItem.detail = labelType;
            completionItems.push(completionItem);
        });
        return completionItems;
    }
}

export class HackDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
    public async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
        const text: string = document.getText();
        const formatResult = await hh_client.format(text, 0, text.length);
        if (formatResult.internal_error || formatResult.error_message) {
            return undefined;
        }
        const textEdit = vscode.TextEdit.replace(
            new vscode.Range(document.positionAt(0), document.positionAt(text.length)), formatResult.result);
        return [textEdit];
    }
}

export class HackReferenceProvider implements vscode.ReferenceProvider {
    public async provideReferences(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location[]> {
        const text = document.getText();
        const foundRefs = await hh_client.ideFindRefs(text, position.line + 1, position.character + 1);
        const highlightRefs = await hh_client.ideHighlightRefs(text, position.line + 1, position.character + 1);
        const locations: vscode.Location[] = [];
        foundRefs.forEach(ref => {
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
    }
}

export class HackDefinitionProvider implements vscode.DefinitionProvider {
    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Definition> {
        const text = document.getText();
        const foundDefinition = await hh_client.ideGetDefinition(text, position.line + 1, position.character + 1);
        const definition: vscode.Location[] = [];
        foundDefinition.forEach(element => {
            if (element.definition_pos) {
                const location: vscode.Location = new vscode.Location(
                    vscode.Uri.file(element.definition_pos.filename || document.fileName),
                    new vscode.Range(
                        new vscode.Position(element.definition_pos.line - 1, element.definition_pos.char_start - 1),
                        new vscode.Position(element.definition_pos.line - 1, element.definition_pos.char_end)));
                definition.push(location);
            }
        });
        return definition;
    }
}

export class HackCodeActionProvider implements vscode.CodeActionProvider {
    public async provideCodeActions(document: vscode.TextDocument, _: vscode.Range, context: vscode.CodeActionContext): Promise<vscode.Command[]> {
        const filteredErrors = context.diagnostics.filter(d => d.source === 'Hack' && d.code !== 0);
        if (filteredErrors.length > 0) {
            const commands: vscode.Command[] = [];
            for (const error of filteredErrors) {
                commands.push({
                    title: `Suppress: ${error.code}`,
                    command: 'hack.suppressError',
                    arguments: [document, error.range.start.line, [ error.code ]]
                });
            }
            if (commands.length > 1) {
                const allCodes = filteredErrors.map(f => f.code);
                commands.push({
                    title: 'Suppress All',
                    command: 'hack.suppressError',
                    arguments: [document, filteredErrors[0].range.start.line, allCodes]
                });
            }
            return commands;
        }
        return undefined;
    }
}
