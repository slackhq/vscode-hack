/**
 * @file hh_client proxy 
 */

'use strict';

import * as child_process from 'child_process';
import * as vscode from 'vscode';

export function typeAtPos(fileName: string, line: number, character: number): Thenable<string> {
    const arg: string = fileName + ':' + line + ':' + character;
    const args: string[] = ['--type-at-pos', arg];
    return run(args).then((value: {type: string}) => { // tslint:disable-line
        if (!value.type || value.type === '(unknown)' || value.type === '_') {
            return;
        }
        return value.type;
    });
}

export function outline(text: string): Thenable<any> {
    return run(['--outline'], text);
}

export function ideHighlightRefs(text: string, line: number, character: number): Thenable<any> {
    return run(['--ide-highlight-refs', line + ':' + character], text);
}

export function autoComplete(text: string, position: number): Thenable<any> {
    // Insert hh_client autocomplete token at cursor position.
    let autoTok: string = 'AUTO332'
    var input = [text.slice(0, position), autoTok, text.slice(position)].join('');
    return run(['--auto-complete'], input);
}

function run(args: string[], stdin: string = null): Thenable<any> {
    return new Promise<string>((resolve, reject) => {

        // Spawn `hh_client` process
        args = args.concat(['--json', vscode.workspace.rootPath]);
        const p = child_process.spawn('hh_client', args, {});
        if (stdin) {
            p.stdin.write(stdin);
            p.stdin.end();
        }
        let stdout: string = '';
        p.stdout.on('data', data => {
            stdout += data;
        });
        let stderr: string = '';
        p.stderr.on('data', data => {
            stderr += data;
        });
        p.on('exit', code => {
            if (code !== 0) {
                console.error(stderr);
                reject(stderr);
            }else {
                resolve(JSON.parse(stdout));
            }
        });
    });
}
