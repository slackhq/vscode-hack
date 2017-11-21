/**
 * Loads values from VS Code config. It is currently only read at extension launch,
 * but config change watchers can be added here if needed.
 */

import * as vscode from 'vscode';

const hackConfig = vscode.workspace.getConfiguration('hack');

export const clientPath: string = hackConfig.get('clientPath') || 'hh_client';
export const hhClientArgs: string[] = clientPath.split(' ');
export const hhClientPath: string = String(hhClientArgs.shift());

export const workspace: string = hackConfig.get('workspaceRootPath') || vscode.workspace.rootPath || '';
export const enableCoverageCheck: boolean = hackConfig.get('enableCoverageCheck') || false;
export const useLanguageServer: boolean = hackConfig.get('useLanguageServer') || false;
