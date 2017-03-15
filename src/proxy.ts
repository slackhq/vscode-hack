/**
 * @file hh_client proxy
 */

'use strict';

import * as ps from 'child_process';
import * as vscode from 'vscode';

export async function start()
    : Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
        const hhClient = vscode.workspace.getConfiguration('hack').get('clientPath') || 'hh_client'; // tslint:disable-line
        ps.exec(hhClient + ' --version', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return resolve(false);
            }
            return resolve(true);
        });
    });
}

export async function check(): Promise<CheckResponse> {
    return run(['check'], null, true);
}

export async function color(fileName: string): Promise<ColorResponse> {
    return run(['--color', fileName]);
}

export async function typeAtPos(fileName: string, line: number, character: number): Promise<string> {
    const arg: string = fileName + ':' + line + ':' + character;
    const args: string[] = ['--type-at-pos', arg];
    const typeAtPos: TypeAtPosResponse = await run(args);

    if (!typeAtPos || !typeAtPos.type || typeAtPos.type === '(unknown)' || typeAtPos.type === '_' || typeAtPos.type === 'noreturn') {
        return;
    }
    return typeAtPos.type;
}

export async function outline(text: string): Promise<OutlineResponse[]> { // tslint:disable-line
    return run(['--outline'], text);
}

export async function search(query: string): Promise<SearchResponse> {
    return run(['--search', query]);
}

export async function ideFindRefs(text: string, line: number, character: number): Promise<IdeFindRefsResponse> {
    return run(['--ide-find-refs', line + ':' + character], text);
}

export async function ideHighlightRefs(text: string, line: number, character: number): Promise<IdeHighlightRefsResponse> {
    return run(['--ide-highlight-refs', line + ':' + character], text);
}

export async function ideGetDefinition(text: string, line: number, character: number): Promise<IdeGetDefinitionResponse> {
    return run(['--ide-get-definition', line + ':' + character], text);
}

export async function autoComplete(text: string, position: number): Promise<AutoCompleteResponse> {
    // Insert hh_client autocomplete token at cursor position.
    const autoTok: string = 'AUTO332';
    const input = [text.slice(0, position), autoTok, text.slice(position)].join('');
    return run(['--auto-complete'], input);
}

export async function format(text: string, startPos: number, endPos: number): Promise<FormatResponse> {
    return run(['--format', '' + startPos, '' + endPos], text);
}

async function run(args: string[], stdin: string = null, readStderr: boolean = false): Promise<any> { // tslint:disable-line
    return new Promise<any>((resolve, reject) => { // tslint:disable-line
        // Spawn `hh_client` process
        args = args.concat(['--json', vscode.workspace.rootPath]);
        let p: ps.ChildProcess;
        try {
            const hhClient = vscode.workspace.getConfiguration('hack').get('clientPath') || 'hh_client'; // tslint:disable-line
            p = ps.spawn('' + hhClient, args, {});
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

/**
 * Types for hh_client responses
 */

type Position = {
    filename: string,
    line: number,
    char_start: number,
    char_end: number
};

type Span = {
    filename: string,
    line_start: number,
    char_start: number,
    line_end: number,
    char_end: number
};

type CheckResponse = {
    passed: boolean;
    errors: {
        message:
        {
            descr: string,
            path: string,
            line: number,
            start: number,
            end: number,
            code: number
        }[]
    }[]
};

type ColorResponse = {
    color: string,
    text: string
}[];

export type OutlineResponse = {
    name: string,
    kind: string,
    id: string,
    position: Position,
    span: Span,
    children: OutlineResponse[]
};

type SearchResponse = {
    name: string,
    filename: string,
    desc: string,
    line: number,
    char_start: number,
    char_end: number,
    scope: string
}[];

type IdeFindRefsResponse = {
    name: string,
    filename: string,
    line: number,
    char_start: number,
    char_end: number
}[];

type IdeHighlightRefsResponse = {
    line: number,
    char_start: number,
    char_end: number
}[];

type IdeGetDefinitionResponse = {
    name: string,
    result_type: string,
    pos: Position,
    definition_pos: Position,
    definition_span: Span,
    definition_id: number
}[];

type AutoCompleteResponse = {
    name: string,
    type: string, // tslint:disable-line
    pos: Position,
    func_details: {
        min_arity: number,
        return_type: string,
        params: {
            name: string,
            type: string, // tslint:disable-line
            variadic: boolean
        }[]
    }
}[];

type FormatResponse = {
    result: string,
    error_message: string,
    internal_error: boolean
};

type TypeAtPosResponse = {
    type: string // tslint:disable-line
};
