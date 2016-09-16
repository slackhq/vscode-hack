/**
 * @file Extension providers.
 */

'use strict';

import * as hh_client from './proxy';
import { CancellationToken, DocumentHighlight, DocumentHighlightKind, DocumentHighlightProvider, DocumentSymbolProvider, Hover,
    HoverProvider, MarkedString, Position, Range, SymbolInformation, SymbolKind, TextDocument } from 'vscode';

export class HackHoverProvider implements HoverProvider {
    public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        const startPosition = document.getWordRangeAtPosition(position).start;
        const line: number = startPosition.line + 1;
        const character: number = startPosition.character + 1;

        return hh_client.getTypeAtPosition(document.fileName, line, character).then(value => {
            if (value) {
                const formattedMessage: MarkedString = { language: 'hack', value: value };
                return new Hover(formattedMessage);
            }
        });
    }
}

export class HackDocumentSymbolProvider implements DocumentSymbolProvider {

    private static symbolArray = [
        { key: 'function', value: SymbolKind.Function },
        { key: 'method', value: SymbolKind.Method },
        { key: 'class', value: SymbolKind.Class }
    ];

    private static symbolMap = new Map(
            HackDocumentSymbolProvider.symbolArray.map<[string, SymbolKind]>(x => [x.key, x.value])
    );

    public provideDocumentSymbols(document: TextDocument, token: CancellationToken): Thenable<SymbolInformation[]> {
        return hh_client.getDocumentSymbols(document.getText()).then((value: {name: string,
            type: string, line: number, char_start: number, char_end: number}[]) => { // tslint:disable-line
            const symbols: SymbolInformation[] = [];
            value.forEach(element => {
                const fullName: string = element.name;
                const nameSplit = fullName.split('\\');
                let name: string = nameSplit[nameSplit.length - 1];
                const symbolKind = HackDocumentSymbolProvider.symbolMap.has(element.type)
                    ? HackDocumentSymbolProvider.symbolMap.get(element.type)
                    : SymbolKind.Null;
                let container: string = null;
                switch (symbolKind) {
                    case SymbolKind.Class:
                        container = fullName.slice(0, fullName.lastIndexOf('\\'));
                        break;
                    case SymbolKind.Method:
                        container = name.slice(0, name.indexOf('::'));
                        name = name.slice(name.indexOf('::') + 2, name.length);
                        break;
                    default:
                        break;
                }
                const range = new Range(
                    new Position(element.line - 1, element.char_start - 1),
                    new Position(element.line - 1, element.char_end - 1));
                symbols.push(new SymbolInformation(name, symbolKind, range, null, container));
            });
            return symbols;
        });
    }
}

export class HackDocumentHighlightProvider implements DocumentHighlightProvider {
    public provideDocumentHighlights(document: TextDocument, position: Position, token: CancellationToken):
        Thenable<DocumentHighlight[]> {
        return hh_client.getIdeHighlightRefs(document.getText(), position.line + 1, position.character + 1).then(value => {
            const highlights: DocumentHighlight[] = [];
            value.forEach(element => {
                const line: number = element['line'] - 1;
                const charStart: number = element['char_start'] - 1;
                const charEnd: number = element['char_end'];
                highlights.push(new DocumentHighlight(
                    new Range(new Position(line, charStart), new Position(line, charEnd)),
                    DocumentHighlightKind.Text));
            });
            return highlights;
        });
    }
}
