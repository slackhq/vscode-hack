/**
 * Utility functions to help with file path parsing and others
 */

import * as vscode from 'vscode';
import * as config from './Config';

/**
 * Converts a local workspace URI to a file path string, mapping path to an
 * alternate workspace root if configured.
 * @param value The file URI to convert
 */
export const mapFromWorkspaceUri = (value: vscode.Uri) => {
    return mapFromWorkspacePath(value.fsPath);
};

/**
 * Converts a file path string to a local workspace URI, mapping from an
 * alternate workspace root if configured.
 * @param value The file path to convert
 */
export const mapToWorkspaceUri = (value: string) => {
    return vscode.Uri.parse(mapToWorkspacePath(value));
};

/**
 * If a workspace mapping is specified in vscode settings, convert a local workspace file
 * path's root to the configured alternate path.
 * @param fileName The file path to convert
 */
export const mapFromWorkspacePath = (fileName: string) => {
    if (config.workspace && vscode.workspace.rootPath) {
        return fileName.replace(vscode.workspace.rootPath, config.workspace);
    }
    return fileName;
};

/**
 * If a workspace mapping is specified in vscode settings, convert a mapped file path's
 * root back to the local workspace.
 * @param fileName The file path to convert
 */
export const mapToWorkspacePath = (fileName: string) => {
    if (config.workspace && vscode.workspace.rootPath) {
        return fileName.replace(config.workspace, vscode.workspace.rootPath);
    }
    return fileName;
};
