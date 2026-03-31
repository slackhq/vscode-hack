import * as vscode from "vscode";

import * as hack from "./types/hack";

export class HackLanguageServerStatus {
  private versionText: string;

  constructor(
    private status: vscode.StatusBarItem,
    private remoteType: string,
    version: hack.Version,
  ) {
    this.versionText = this.getVersionText(version);
    this.status.name = this.versionText;
  }

  showError(tooltip: string, command: string): void {
    this.status.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
    this.status.text = `$(error) ${this.versionText}`;
    this.status.tooltip = tooltip;
    this.status.command = command;
    this.status.show();
  }

  showSuccess(text?: string, tooltip?: string): void {
    this.status.backgroundColor = undefined;
    this.status.command = undefined;
    this.status.text = text ?? this.versionText;
    this.status.tooltip = tooltip;
    this.status.show();
  }

  showAlert(text?: string, tooltip?: string): void {
    this.showSuccess(
      text
        ? `$(alert) ${this.versionText} ${text}`
        : `$(alert) ${this.versionText}`,
      tooltip,
    );
  }

  showProgress(tooltip: string): void {
    this.showSuccess(`$(sync~spin) ${this.versionText}`, tooltip);
  }

  private getVersionText(version: hack.Version): string {
    const hhvmVersion = version.commit.split("-").pop();
    let statusText = hhvmVersion ? `Hack LSP ${hhvmVersion}` : "Hack LSP";
    if (this.remoteType === "ssh") {
      statusText += " (Remote)";
    } else if (this.remoteType === "docker") {
      statusText += " (Docker)";
    }
    return statusText;
  }
}
