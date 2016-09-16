'use strict';

import { CancellationToken } from 'vscode';
import cp = require('child_process');

export class HHClient {
    public static getTypeAtPosition(fileName: string, line: number, character: number): Thenable<string> {
        let arg: string = fileName + ":" + line + ":" + character;
        let args: string[] = ['--type-at-pos', arg];
        return HHClient.run(args).then(value => {
            if (!value['type'] || value['type'] == "(unknown)" || value['type'] == "_") {
                return;
            }
            return value['type'];
        });
    }

    public static getDocumentSymbols(text: string): Thenable<any> {
        return HHClient.run(['--outline'], text);
    }

    private static run(args: string[], stdin: string = null): Thenable<any> {
        return new Promise<string>((resolve, reject) => {
            
            // Spawn `hh_client` process
            args = args.concat(['--json', '/Users/pranay/Documents/Projects/HackFirst']);
            let p = cp.spawn('hh_client', args, {});
            if (stdin) {
                p.stdin.write(stdin);
                p.stdin.end();
            }
            var output: string = '';
            p.stdout.on('data', data => {
                output += data;
            })
            p.on('exit', code => {
                if (code !== 0) {
                    console.error(p.stderr);
                    reject(p.stderr);
                }
                else {
                    resolve(JSON.parse(output));
                }
            });
        });
    } 
}