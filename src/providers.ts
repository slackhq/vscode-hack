'use strict';

import { HoverProvider, Hover, MarkedString, TextDocument, Position, CancellationToken } from 'vscode';
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
