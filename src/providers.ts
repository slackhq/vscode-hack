'use strict';

import { HoverProvider, DocumentSymbolProvider, Hover, MarkedString, TextDocument, Position, Range, SymbolInformation, SymbolKind, CancellationToken } from 'vscode';
import { HHClient } from './proxy';
import cp = require('child_process');

export class HackHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        let startPosition = document.getWordRangeAtPosition(position).start;
        let line: number = startPosition.line + 1;
        let character: number = startPosition.character + 1;
        
        return HHClient.getTypeAtPosition(document.fileName, line, character).then(value => {
            if (value){
                let formattedMessage: MarkedString = { language: 'hack', value: value };
                return new Hover(formattedMessage);
            }
        });
    }
}

export class HackDocumentSymbolProvider implements DocumentSymbolProvider {
   
    private static symbolArray = [
        { key: "function", value: SymbolKind.Function },
        { key: "method", value: SymbolKind.Method },
        { key: "class", value: SymbolKind.Class }
    ];

    private static symbolMap = new Map(
            HackDocumentSymbolProvider.symbolArray.map<[string, SymbolKind]>(x => [x.key, x.value])
    );

    public provideDocumentSymbols(document: TextDocument, token: CancellationToken): Thenable<SymbolInformation[]> {
        var doc = '';
		return HHClient.getDocumentSymbols(document.getText()).then(value => {
			let symbols: SymbolInformation[] = [];
            value.forEach(element => {
                let fullName: string = element['name'];
                let nameSplit = fullName.split('\\');
                let name:string = nameSplit[nameSplit.length - 1];
                var symbolKind = HackDocumentSymbolProvider.symbolMap.has(element['type']) ? HackDocumentSymbolProvider.symbolMap.get(element['type']) : SymbolKind.Null;
                let container: string = null;
                switch(symbolKind){
                    case SymbolKind.Method:
                        container = name.slice(0, name.indexOf("::"));
                        name = name.slice(name.indexOf("::") + 2, name.length);
                }
                var range = new Range(new Position(element['line']-1, element['char_start']-1), new Position(element['line']-1, element['char_end']-1))
                symbols.push(new SymbolInformation(name, symbolKind, range, null, container));
            });
			return symbols;
		});
	}
}