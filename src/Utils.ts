/**
 * Utility functions to help with file path parsing and others
 */

import * as vscode from "vscode";
import { HackConfig } from "./Config";

function getUriFilePath(path: string | undefined): string {
  return path ? vscode.Uri.file(path).toString() : "";
}

/**
 * Converts a local workspace URI to a file path string (with or without scheme) to pass to
 * the typechecker. Path is mapped to an alternate workspace root if configured.
 * @param config The extension configuration
 * @param file The file URI to convert
 */
export const mapFromWorkspaceUri = (
  config: HackConfig,
  file: vscode.Uri,
): string => {
  if (!config.remoteEnabled || !config.remoteWorkspacePath) {
    return file.toString();
  }
  const localPath = getUriFilePath(config.localWorkspacePath);
  const remotePath = getUriFilePath(config.remoteWorkspacePath);
  return file.toString().replace(localPath, remotePath);
};

/**
 * Converts a file path string received from the typechecker to a local workspace URI.
 * Path is mapped from an alternate workspace root if configured.
 * @param config The extension configuration
 * @param file The file path to convert
 */
export const mapToWorkspaceUri = (
  config: HackConfig,
  file: string,
): vscode.Uri => {
  let filePath = file;
  if (config.remoteEnabled && config.remoteWorkspacePath) {
    const localPath = getUriFilePath(config.localWorkspacePath);
    const remotePath = getUriFilePath(config.remoteWorkspacePath);
    filePath = filePath.replace(remotePath, localPath);
  }
  if (filePath.startsWith("file://")) {
    return vscode.Uri.parse(filePath);
  } else {
    return vscode.Uri.file(filePath);
  }
};
