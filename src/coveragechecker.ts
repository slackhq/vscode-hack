/**
 * @file Logic to calculate Hack coverage percentage of a source file.
 */

import * as vscode from 'vscode';
import * as hh_client from './proxy';
import * as utils from './Utils';

type UnfilteredTypeCoverageRegion = {
    regionType: string,
    line: number,
    start: number,
    end: number
};

export class HackCoverageChecker implements vscode.Disposable {

    // internal cache of known files mapped to their individual coverage errors
    private cache: Map<string, vscode.Diagnostic[]> = new Map<string, vscode.Diagnostic[]>();

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
    private static convertTypedRegionsToCoverageResult(regions: { color: string, text: string }[])
        : { percentage: number, uncoveredRegions: UnfilteredTypeCoverageRegion[] } {
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
            uncoveredRegions: unfilteredResults.filter(
                region => region.regionType === 'unchecked' || region.regionType === 'partial')
        };
    }

    public async start(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => { this.run(document, false); }));
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => { this.hhvmCoverDiag.delete(document.uri); }));
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            this.coverageStatus.hide();
            if (editor) {
                this.run(editor.document, true);
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('hack.toggleCoverageHighlight', () => { this.toggle(); }));
        context.subscriptions.push(this.hhvmCoverDiag, this.coverageStatus);
        for (const document of vscode.workspace.textDocuments) {
            await this.run(document, true);
        }
    }

    public async toggle() {
        if (this.visible) {
            this.hhvmCoverDiag.clear();
            this.visible = false;
        } else {
            const openEditors = vscode.window.visibleTextEditors;
            if (openEditors.length > 0) {
                for (const editor of openEditors) {
                    await this.run(editor.document, true);
                }
            }
            this.visible = true;
        }
    }

    public dispose() {
        throw new Error('Method not implemented.');
    }

    // todo put percentage in cache as well
    private async run(document: vscode.TextDocument, useCached: boolean) {
        if (document.languageId !== 'hack') {
            return;
        }
        const cachedFileDiagnostics = this.cache.get(document.fileName);
        if (!useCached && cachedFileDiagnostics) {
            this.cache.delete(document.fileName);
        } else if (useCached && cachedFileDiagnostics && this.visible) {
            this.hhvmCoverDiag.set(vscode.Uri.file(document.fileName), cachedFileDiagnostics);
            return;
        }
        const colorResult = await hh_client.color(utils.mapFromWorkspacePath(document.fileName));
        if (!colorResult) {
            this.coverageStatus.hide();
            this.hhvmCoverDiag.clear();
            return;
        }
        const coverageResult = HackCoverageChecker.convertTypedRegionsToCoverageResult(colorResult);
        if (!coverageResult) {
            return;
        }
        this.coverageStatus.text = `$(paintcan)  ${coverageResult.percentage.toFixed(0)}%`;
        this.coverageStatus.tooltip = `This file is ${coverageResult.percentage.toFixed(0)}% covered by Hack.\nClick to toggle highlighting of uncovered areas.`;
        this.coverageStatus.command = 'hack.toggleCoverageHighlight';
        this.coverageStatus.show();

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
                vscode.DiagnosticSeverity.Warning);
            diagnostic.source = 'Type Coverage';
            diagnostics.push(diagnostic);
        });
        this.cache.set(document.fileName, diagnostics);
        if (this.visible) {
            this.hhvmCoverDiag.set(document.uri, diagnostics);
        }
    }
}
