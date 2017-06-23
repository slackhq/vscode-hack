/**
 * @file hh_client proxy
 */

'use strict';

import * as ps from 'child_process';
import * as vscode from 'vscode';

export function start(hhClient: string): boolean {
    try {
        const hackConfig = vscode.workspace.getConfiguration('hack');
        const useDocker = hackConfig.useDocker;
        if (useDocker) {
            const dockerContainerName = hackConfig.dockerContainerName;
            const dockerSourcePath = String(hackConfig.dockerSourcePath);
            ps.execFileSync('docker', ['exec', '-i', dockerContainerName, 'hh_client', 'start', dockerSourcePath]);
        } else {
            ps.execFileSync(hhClient, ['start', vscode.workspace.rootPath]);
        }
        return true;
    } catch (err) {
        if (err.status === 77) {
            // server was already running
            return true;
        }
        return false;
    }
}

export async function check(): Promise<CheckResponse> {
    return run(['check']);
}

export async function color(fileName: string): Promise<ColorResponse> {
    return run(['--color', getDockerSourcePath(fileName)]);
}
function getDockerSourcePath(fileName: string): string {
    const dockerSourcePath = String(vscode.workspace.getConfiguration('hack').get('dockerSourcePath'));
    return fileName.replace(vscode.workspace.rootPath, dockerSourcePath);
}
export async function typeAtPos(fileName: string, line: number, character: number): Promise<string> {
    const arg: string = getDockerSourcePath(fileName) + ':' + line + ':' + character;
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

async function run(args: string[], stdin: string = null): Promise<any> { // tslint:disable-line
    return new Promise<any>((resolve, reject) => { // tslint:disable-line
        let hhClient = vscode.workspace.getConfiguration('hack').get('clientPath') || 'hh_client'; // tslint:disable-line
        const useDocker = vscode.workspace.getConfiguration('hack').get('useDocker');
        if (useDocker) {
            const dockerContainerName = String(vscode.workspace.getConfiguration('hack').get('dockerContainerName'));
            const dockerSourcePath = String(vscode.workspace.getConfiguration('hack').get('dockerSourcePath'));

            const dockerargs = ['exec', '-i', dockerContainerName, 'hh_client'];
            hhClient = 'docker';

            if (dockerSourcePath) {
                args = args.concat(['--json', dockerSourcePath]);
                args = dockerargs.concat(args);
                //console.log('docker', args.join(' '));
            } else {
                console.error('Hack: hh_client execution invalid docker source path ');
            }
        } else {
            args = args.concat(['--json', vscode.workspace.rootPath]);
        }
        const p = ps.execFile(String(hhClient), args, { maxBuffer: 1024 * 1024 }, (err: any, stdout, stderr) => { // tslint:disable-line
            if (err !== null && err.code !== 0 && err.code !== 2) {
                // any hh_client failure other than typecheck errors
                console.error('Hack: hh_client execution error: ' + err);
                resolve(null);
            }
            if (!stdout) {
                // all hh_client --check output goes to stderr by default
                stdout = stderr;
            }
            try {
                const output = JSON.parse(stdout);
                resolve(output);
            } catch (parseErr) {
                console.error('Hack: hh_client output error: ' + parseErr);
                resolve(null);
            }
        });
        if (stdin) {
            p.stdin.write(stdin);
            p.stdin.end();
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
