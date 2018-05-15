/**
 * Utility functions to help with file path parsing and others
 */

import * as vscode from 'vscode';
import * as config from './Config';

/**
 * Converts a local workspace URI to a file path string (with or without scheme) to pass to
 * the typechecker. Path is mapped to an alternate workspace root if configured.
 * @param file The file URI to convert
 * @param includeScheme Whether to include the file:// scheme in the response or not
 */
export const mapFromWorkspaceUri = (file: vscode.Uri, includeScheme: boolean = true): string => {
    if (!config.mapWorkspace && includeScheme) {
        return file.toString();
    }
    let filePath = file.fsPath;
    if (config.mapWorkspace && vscode.workspace.workspaceFolders) {
        filePath = filePath.replace(vscode.workspace.workspaceFolders[0].uri.fsPath, config.workspace);
    }
    if (includeScheme) {
        return vscode.Uri.file(filePath).toString();
    }
    return filePath;
};

/**
 * Converts a file path string received from the typechecker to a local workspace URI.
 * Path is mapped from an alternate workspace root if configured.
 * @param file The file path to convert
 */
export const mapToWorkspaceUri = (file: string): vscode.Uri => {
    let filePath = file;
    if (config.mapWorkspace && vscode.workspace.workspaceFolders) {
        filePath = filePath.replace(config.workspace, vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
    if (filePath.startsWith('file://')) {
        return vscode.Uri.parse(filePath);
    } else {
        return vscode.Uri.file(filePath);
    }
};
