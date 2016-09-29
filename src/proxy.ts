/**
 * @file hh_client proxy 
 */

'use strict';

import * as child_process from 'child_process';
import * as domain from 'domain';
import * as vscode from 'vscode';

export function start()
    : boolean {

    try {
        const p = child_process.execSync('hh_client', ['start', vscode.workspace.rootPath])
        return true;
    } catch (err) {
        console.error(err.message);
        return false;
    }
}

export function check()
    : Thenable<{ passed: boolean, errors: { message: { descr: string, path: string, line: number, start: number, end: number, code: number }[] }[] }> { // tslint:disable-line
    return run(['check'], null, true);
}

export function color(fileName: string)
    : Thenable<{ color: string, text: string }[]> {
    return run(['--color', fileName]);
}

export function typeAtPos(fileName: string, line: number, character: number)
    : Thenable<string> {
    const arg: string = fileName + ':' + line + ':' + character;
    const args: string[] = ['--type-at-pos', arg];
    return run(args).then((value: { type: string }) => { // tslint:disable-line
        if (!value.type || value.type === '(unknown)' || value.type === '_') {
            return;
        }
        return value.type;
    });
}

export function outline(text: string)
    : Thenable<{ name: string, type: string, line: number, char_start: number, char_end: number }[]> { // tslint:disable-line
    return run(['--outline'], text);
}

export function findLvarRefs(text: string, line: number, character: number)
    : Thenable<{ positions: { filename: string, line: number, char_start: number, char_end: number }[], internal_error: boolean }> {
    return run(['--find-lvar-refs', line + ':' + character], text);
}

export function ideFindRefs(text: string, line: number, character: number)
    : Thenable<{ name: string, filename: string, line: number, char_start: number, char_end: number }[]> {
    return run(['--ide-find-refs', line + ':' + character], text);
}

export function ideHighlightRefs(text: string, line: number, character: number)
    : Thenable<{ line: number, char_start: number, char_end: number }[]> {
    return run(['--ide-highlight-refs', line + ':' + character], text);
}

export function autoComplete(text: string, position: number)
    : Thenable<{ name: string, type: string }[]> { // tslint:disable-line
    // Insert hh_client autocomplete token at cursor position.
    const autoTok: string = 'AUTO332';
    const input = [text.slice(0, position), autoTok, text.slice(position)].join('');
    return run(['--auto-complete'], input);
}

export function format(text: string, startPos: number, endPos: number)
    : Thenable<{ result: string, error_message: string, internal_error: boolean }> {
    return run(['--format', '' + startPos, '' + endPos], text);
}

function run(args: string[], stdin: string = null, readStderr: boolean = false)
    : Thenable<any> {
    return new Promise<any>((resolve, reject) => {

        // Spawn `hh_client` process
        args = args.concat(['--json', vscode.workspace.rootPath]);
        let p: child_process.ChildProcess;
        try {
            p = child_process.spawn('hh_client', args, {});
        } catch (err) {
            return reject(err);
        }

        if (p.pid) {
            if (stdin) {
                p.stdin.write(stdin);
                p.stdin.end();
            }
            let stdout: string = '';
            p.stdout.on('data', (data: Buffer) => {
                stdout += data;
            });
            let stderr: string = '';
            p.stderr.on('data', (data: Buffer) => {
                stderr += data;
            });
            p.on('exit', code => {
                try {
                    resolve(JSON.parse((code !== 0 || readStderr) ? stderr : stdout));
                } catch (err) {
                    console.error(stderr);
                    resolve(null);
                }
            });
        }
    });
}
