/**
 * @file Provides the test view functionality
 */

import * as vscode from 'vscode';

export class HackTestDataProvider implements vscode.TreeDataProvider<HackTestTreeItem> {
    public onDidChangeTreeData?: vscode.Event<HackTestTreeItem | null | undefined> | undefined;

    public getTreeItem(element: HackTestTreeItem): HackTestTreeItem {
        return element;
    }

    public getChildren(element?: HackTestTreeItem | undefined): vscode.ProviderResult<HackTestTreeItem[]> {
        if (!element) {
            return [
                new HackTestTreeItem('folder1', 'Folder 1', 'folder'),
                new HackTestTreeItem('folder2', 'Folder 2', 'folder'),
                new HackTestTreeItem('folder3', 'Folder 3', 'folder')
            ];
        } else if (element.id === 'folder1') {
            return [
                new HackTestTreeItem('folder4', 'Folder 4', 'folder'),
                new HackTestTreeItem('class1', 'Class 1', 'class'),
                new HackTestTreeItem('class2', 'Class 2', 'class')
            ];
        } else if (element.id === 'class1') {
            return [
                new HackTestTreeItem('test1', 'Test 1', 'test'),
                new HackTestTreeItem('test2', 'Test 2', 'test'),
                new HackTestTreeItem('test3', 'Test 3', 'test')
            ];
        } else {
            return undefined;
        }
    }
}

class HackTestTreeItem extends vscode.TreeItem {
    constructor(id: string, label: string, contextValue: string) {
        super(label);
        this.id = id;
        this.collapsibleState = (contextValue === 'test') ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded;
        this.contextValue = contextValue;
        if (this.contextValue === 'folder') {
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }
}
