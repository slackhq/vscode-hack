'use strict';

import { HoverProvider, Hover, MarkedString, TextDocument, Position, Range, CancellationToken } from 'vscode';
import cp = require('child_process');

export class HackHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        return new Promise<Hover>((resolve, reject) => {

            let startPosition = document.getWordRangeAtPosition(position).start;
            let arg = document.fileName + ":" + (startPosition.line + 1) + ":" + (startPosition.character + 1);
                                               
            // Spawn `hh_client` process
            let p = cp.execFile('hh_client', ['--type-at-pos', arg, "/Users/pranay/Documents/Projects/HackFirst"], {}, (err, stdout, stderr) => {
                try {
                    if (err) {
                        console.log(err);
                        return resolve(null)
                    };
                    let result: string = stdout.toString().replace("\n", "");
                    if (result == "(unknown)" || result == "<static>" || result == "_"){
                        return resolve(null);
                    }
                    let formattedMessage: MarkedString = { language: 'hack', value: result };
                    return resolve(new Hover(formattedMessage));
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
