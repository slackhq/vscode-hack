/**
 * @file hh_client proxy 
 */

'use strict';

import * as child_process from 'child_process';
import * as vscode from 'vscode';

export function getTypeAtPosition(fileName: string, line: number, character: number): Thenable<string> {
    const arg: string = fileName + ':' + line + ':' + character;
    const args: string[] = ['--type-at-pos', arg];
    return run(args).then((value: {type: string}) => { // tslint:disable-line
        if (!value.type || value.type === '(unknown)' || value.type === '_') {
            return;
        }
        return value.type;
    });
}

export function getDocumentSymbols(text: string): Thenable<any> {
    return run(['--outline'], text);
}

export function getIdeHighlightRefs(text: string, line: number, character: number): Thenable<any> {
    return run(['--ide-highlight-refs', line + ':' + character], text);
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
