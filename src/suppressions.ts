/**
 * @file Function triggered from 'hack.suppressError' command to add a suppress error comment before the given line.
 */

import * as vscode from 'vscode';

export function suppressError(document: vscode.TextDocument, line: number, errorCodes: number[]) {
    const edit = new vscode.WorkspaceEdit();
    const fullLine = document.lineAt(line);
    const prefixIndex = fullLine.firstNonWhitespaceCharacterIndex;
    const prefix = fullLine.text.substr(0, prefixIndex);
    errorCodes.forEach(code => {
        edit.insert(document.uri, new vscode.Position(line, 0), `${prefix}/* HH_FIXME[${code}] */\n`);
    });
    return vscode.workspace.applyEdit(edit);
}
