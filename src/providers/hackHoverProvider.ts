'use strict';

import { HoverProvider, Hover, MarkedString, TextDocument, Position, Range, CancellationToken } from 'vscode';
import cp = require('child_process');

export class HackHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        return new Promise<Hover>((resolve, reject) => {

            let startPosition = document.getWordRangeAtPosition(position).start;
            let arg = document.fileName + ":" + (startPosition.line + 1) + ":" + (startPosition.character + 1);
                                               
            // Spawn `hh_client` process
            let p = cp.execFile('hh_client', ['--type-at-pos', arg, "/home/pranay/Documents/Projects/HackFirst"], {}, (err, stdout, stderr) => {
                try {
                    if (err) {
                        console.log(err);
                        return resolve(null)
                    };
                    let result = stdout.toString();
                    result = result.replace("\n", "");
                    console.log(result);
                    if (result == "(unknown)"){
                        return resolve(null);
                    }
                    return resolve(new Hover(result));
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}

