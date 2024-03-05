/**
 * @file Logic to calculate Hack coverage percentage of a source file.
 */

import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { TypeCoverageResponse } from "./types/lsp";

export class HackCoverageChecker {
  // whether coverage errors are highlighted in code and visible in the "Problems" tab
  private visible: boolean = false;

  // the percentage coverage indicator in the status bar
  private coverageStatus: vscode.StatusBarItem;

  // the global coverage error collection
  private hhvmCoverDiag: vscode.DiagnosticCollection;

  // the global hack language client instance
  private languageClient: LanguageClient;

  constructor(languageClient: LanguageClient) {
    this.coverageStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.hhvmCoverDiag =
      vscode.languages.createDiagnosticCollection("hack_coverage");
    this.languageClient = languageClient;
  }

  public async start(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (doc) => this.check(doc))
    );
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor) {
          await this.check(editor.document);
        } else {
          this.hhvmCoverDiag.clear();
          this.coverageStatus.hide();
        }
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "hack.toggleCoverageHighlight",
        async () => this.toggle()
      )
    );
    context.subscriptions.push(this.hhvmCoverDiag, this.coverageStatus);

    // Check the active file, if any
    if (vscode.window.activeTextEditor) {
      await this.check(vscode.window.activeTextEditor.document);
    }
  }

  public async toggle() {
    if (this.visible) {
      this.hhvmCoverDiag.clear();
      this.visible = false;
    } else {
      this.visible = true;
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await this.check(editor.document);
      }
    }
  }

  private async check(document: vscode.TextDocument) {
    this.hhvmCoverDiag.clear();
    if (document.languageId !== "hack" || document.uri.scheme !== "file") {
      this.coverageStatus.hide();
      return;
    }

    let coverageResponse: TypeCoverageResponse;
    try {
      coverageResponse =
        await this.languageClient.sendRequest<TypeCoverageResponse>(
          "textDocument/typeCoverage",
          {
            textDocument:
              this.languageClient.code2ProtocolConverter.asTextDocumentIdentifier(
                document
              ),
          }
        );
    } catch (e) {
      this.coverageStatus.hide();
      return;
    }

    this.coverageStatus.text = `$(paintcan)  ${coverageResponse.coveredPercent}%`;
    this.coverageStatus.tooltip = `This file is ${coverageResponse.coveredPercent}% covered by Hack.\nClick to toggle highlighting of uncovered areas.`;
    this.coverageStatus.command = "hack.toggleCoverageHighlight";
    this.coverageStatus.show();

    if (this.visible && coverageResponse.uncoveredRanges) {
      const diagnostics: vscode.Diagnostic[] = [];
      coverageResponse.uncoveredRanges.forEach((uncoveredRange) => {
        const diagnostic = new vscode.Diagnostic(
          uncoveredRange.range,
          uncoveredRange.message || coverageResponse.defaultMessage,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = "Type Coverage";
        diagnostics.push(diagnostic);
      });
      this.hhvmCoverDiag.set(document.uri, diagnostics);
    }
  }
}
