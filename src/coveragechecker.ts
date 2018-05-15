/**
 * @file Logic to calculate Hack coverage percentage of a source file.
 */

import * as vscode from 'vscode';
import * as hh_client from './proxy';
import * as utils from './Utils';

type UnfilteredTypeCoverageRegion = {
    regionType: string;
    line: number;
    start: number;
    end: number;
};

export class HackCoverageChecker {

    // whether coverage errors are visible in the "Problems" tab or not
    private visible: boolean = false;

    // the percentage coverage indicator in the status bar
    private coverageStatus: vscode.StatusBarItem;

    // the global coverage error collection
    private hhvmCoverDiag: vscode.DiagnosticCollection;

    constructor() {
        this.coverageStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.hhvmCoverDiag = vscode.languages.createDiagnosticCollection('hack_coverage');
    }

    /**
     * Converts a list of covered regions (from hh_client --color) to line/character positions in a file.
     *
     * Copied from https://github.com/facebook/nuclide/blob/master/pkg/nuclide-hack-rpc/lib/TypedRegions.js
     * until hhvm returns a better response for coverage runs.
     *
     */
    private static convertTypedRegionsToCoverageResult(regions: { color: string; text: string }[])
        : { percentage: number; uncoveredRegions: UnfilteredTypeCoverageRegion[] } {
        const startColumn = 1;
        let line = 1;
        let column = startColumn;
        const unfilteredResults: UnfilteredTypeCoverageRegion[] = [];
        regions.forEach(region => {
            const regionType = region.color;
            function addMessage(width: number) {
                if (width > 0) {
                    const lastResult = unfilteredResults[unfilteredResults.length - 1];
                    const endColumn = column + width - 1;
                    // Often we'll get contiguous blocks of errors on the same line.
                    if (lastResult && lastResult.regionType === regionType && lastResult.line === line && lastResult.end === column - 1) {
                        // So we just merge them into 1 block.
                        lastResult.end = endColumn;
                    } else {
                        unfilteredResults.push({
                            regionType,
                            line,
                            start: column,
                            end: endColumn
                        });
                    }
                }
            }

            const strings = region.text.split('\n');
            if (strings.length <= 0) {
                return;
            }

            // Add message for each line ending in a new line.
            const lines = strings.slice(0, -1);
            lines.forEach(text => {
                addMessage(text.length);
                line += 1;
                column = startColumn;
            });

            // Add message for the last string which does not end in a new line.
            const lastString = strings[strings.length - 1];
            addMessage(lastString.length);
            column += lastString.length;
        });

        const totalInterestingRegionCount = unfilteredResults.reduce(
            (count, region) => (region.regionType !== 'default' ? count + 1 : count), 0);
        const checkedRegionCount = unfilteredResults.reduce(
            (count, region) => (region.regionType === 'checked' ? count + 1 : count), 0);
        const partialRegionCount = unfilteredResults.reduce(
            (count, region) => (region.regionType === 'partial' ? count + 1 : count), 0);

        return {
            percentage: (totalInterestingRegionCount === 0)
                ? 100
                : (checkedRegionCount + partialRegionCount / 2) / totalInterestingRegionCount * 100,
            uncoveredRegions: unfilteredResults.filter(region => region.regionType === 'unchecked')
        };
    }

    public async start(context: vscode.ExtensionContext) {

        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => this.check(doc)));
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            this.hhvmCoverDiag.clear();
            if (editor) {
                this.check(editor.document);
            } else {
                this.coverageStatus.hide();
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('hack.toggleCoverageHighlight', () => { this.toggle(); }));
        context.subscriptions.push(this.hhvmCoverDiag, this.coverageStatus);

        // Check the active file, if any
        if (vscode.window.activeTextEditor) {
            this.check(vscode.window.activeTextEditor.document);
        }
    }

    public async toggle() {
        if (this.visible) {
            this.hhvmCoverDiag.clear();
            this.visible = false;
        } else {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                this.check(editor.document);
            }
            this.visible = true;
        }
    }

    private async check(document: vscode.TextDocument) {
        if (document.languageId !== 'hack') {
            this.coverageStatus.hide();
            return;
        }
        const colorResult = await hh_client.color(utils.mapFromWorkspaceUri(document.uri, false));
        if (!colorResult) {
            this.coverageStatus.hide();
            return;
        }
        const coverageResult = HackCoverageChecker.convertTypedRegionsToCoverageResult(colorResult);
        if (!coverageResult) {
            this.coverageStatus.hide();
            return;
        }
        this.coverageStatus.text = `$(paintcan)  ${coverageResult.percentage.toFixed(0)}%`;
        this.coverageStatus.tooltip = `This file is ${coverageResult.percentage.toFixed(0)}% covered by Hack.\nClick to toggle highlighting of uncovered areas.`;
        this.coverageStatus.command = 'hack.toggleCoverageHighlight';
        this.coverageStatus.show();

        if (this.visible) {
            const diagnostics: vscode.Diagnostic[] = [];
            coverageResult.uncoveredRegions.forEach(region => {
                const text = (region.regionType === 'unchecked')
                    ? 'Un-type checked code. Consider adding type annotations.'
                    : 'Partially type checked code. Consider adding type annotations.';
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                        new vscode.Position(region.line - 1, region.start - 1),
                        new vscode.Position(region.line - 1, region.end)),
                    text,
                    vscode.DiagnosticSeverity.Information);
                diagnostic.source = 'Type Coverage';
                diagnostics.push(diagnostic);
            });
            this.hhvmCoverDiag.set(document.uri, diagnostics);
        }
    }
}
