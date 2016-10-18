/**
 * @file Extension providers.
 */

'use strict';

import * as hh_client from './proxy';
import * as vscode from 'vscode';

type UnfilteredTypeCoverageRegion = {
        // regionType: 'unchecked' | 'partial' | 'default' | 'checked',
        regionType: string,
        line: number,
        start: number,
        end: number
    };

export class HackCoverageChecker {
    private cache: Map<string, vscode.Diagnostic[]> = new Map<string, vscode.Diagnostic[]>();
    private visible: boolean = false;

    constructor(private coverageStatus: vscode.StatusBarItem, private hhvmCoverDiag: vscode.DiagnosticCollection) {
        vscode.workspace.onDidSaveTextDocument(document => {
            this.run(document, false);
        });
        vscode.workspace.onDidCloseTextDocument(document => {
            hhvmCoverDiag.delete(vscode.Uri.file(document.fileName));
        });
        vscode.window.onDidChangeActiveTextEditor(e => {
            coverageStatus.hide();
            this.run(vscode.window.activeTextEditor.document, true);
        });
    }

    public run(document: vscode.TextDocument, useCached: boolean): Thenable<void> {
        if (document.languageId !== 'hack') {
            return;
        }
        if (!useCached && this.cache.has(document.fileName)) {
            this.cache.delete(document.fileName);
        } else if (useCached && this.cache.has(document.fileName) && this.visible) {
            this.hhvmCoverDiag.set(vscode.Uri.file(document.fileName), this.cache.get(document.fileName));
            return;
        }
        return hh_client.color(document.fileName).then(value => {
            if (!value) {
                this.coverageStatus.hide();
                this.hhvmCoverDiag.clear();
                return;
            }
            return HackCoverageChecker.convertTypedRegionsToCoverageResult(value).then(result => {
                this.coverageStatus.text = '$(paintcan)  ' +  result.percentage.toFixed(0) + '%';
                this.coverageStatus.tooltip = 'This file is ' + result.percentage.toFixed(0) +
                    '% covered by Hack.\nClick to toggle highlighting of uncovered areas.';
                this.coverageStatus.command = "hack.toggleCoverageHighlight";
                this.coverageStatus.show();

                const diagnostics: vscode.Diagnostic[] = [];
                result.uncoveredRegions.forEach(region => {
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(region.line - 1, region.start - 1),
                            new vscode.Position(region.line - 1, region.end)),
                        'Un-type checked code. Consider adding type annotations.',
                        vscode.DiagnosticSeverity.Warning);
                    diagnostic.source = 'Type Coverage';
                    diagnostics.push(diagnostic);
                });
                this.cache.set(document.fileName, diagnostics);
                if (this.visible) {
                    this.hhvmCoverDiag.set(vscode.Uri.file(document.fileName), diagnostics);
                }
            });
        });
    }

    public toggle() {
        if (this.visible) {
            this.hhvmCoverDiag.clear();
            this.visible = false;
        } else {
            this.run(vscode.window.activeTextEditor.document, true);
            this.visible = true;
        }
    }

    /**
     *
     * Copied from https://github.com/facebook/nuclide/blob/master/pkg/nuclide-hack/lib/TypedRegions.js
     * until hhvm returns a better response for coverage runs.
     *
     */
    private static convertTypedRegionsToCoverageResult(regions: {color: string, text: string}[])
        : Thenable<{ percentage: number, uncoveredRegions: UnfilteredTypeCoverageRegion[]}> {
        return new Promise<{ percentage: number, uncoveredRegions: UnfilteredTypeCoverageRegion[]}>((resolve, reject) => {
            if (regions == null) {
                return resolve(null);
            }

            const startColumn = 1;
            let line = 1;
            let column = startColumn;
            const unfilteredResults: UnfilteredTypeCoverageRegion[] = [];
            regions.forEach(region => {
                const regionType = region.color;
                function addMessage(width: number) {
                    if (width > 0) {
                        const last = unfilteredResults[unfilteredResults.length - 1];
                        const endColumn = column + width - 1;
                        // Often we'll get contiguous blocks of errors on the same line.
                        if (last != null && last.regionType === regionType && last.line === line && last.end === column - 1) {
                            // So we just merge them into 1 block.
                            last.end = endColumn;
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
                    return reject();
                }

                // Add message for each line ending in a new line.
                const lines = strings.slice(0, -1);
                lines.forEach(text => {
                addMessage(text.length);
                line += 1;
                column = startColumn;
                });

                // Add message for the last string which does not end in a new line.
                const last = strings[strings.length - 1];
                addMessage(last.length);
                column += last.length;
            });

            const totalInterestingRegionCount = unfilteredResults.reduce(
                (count, region) => (region.regionType !== 'default' ? count + 1 : count), 0);
            const checkedRegionCount = unfilteredResults.reduce(
                (count, region) => (region.regionType === 'checked' ? count + 1 : count), 0);
            const partialRegionCount = unfilteredResults.reduce(
                (count, region) => (region.regionType === 'partial' ? count + 1 : count), 0);

            return resolve({
                percentage: (totalInterestingRegionCount === 0)
                    ? 100
                    : (checkedRegionCount + partialRegionCount / 2) / totalInterestingRegionCount * 100,
                uncoveredRegions: unfilteredResults.filter(
                    region => region.regionType === 'unchecked' || region.regionType === 'partial')
            });
        });
    }
}
