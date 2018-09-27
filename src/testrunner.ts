/**
 * @file Provides the test view functionality
 */

import * as path from 'path';
import * as vscode from 'vscode';

export class HackTestDataProvider implements vscode.TreeDataProvider<HackTestTreeItem> {
    public onDidChangeTreeData?: vscode.Event<HackTestTreeItem | null | undefined> | undefined;

    public getTreeItem(element: HackTestTreeItem): HackTestTreeItem {
        return element;
    }

    public getChildren(element?: HackTestTreeItem | undefined): vscode.ProviderResult<HackTestTreeItem[]> {
        if (!element) {
            return [
                new HackTestTreeItem('c', 'c', 'folder'),
                new HackTestTreeItem('dict', 'dict', 'folder'),
                new HackTestTreeItem('keyset', 'keyset', 'folder'),
                new HackTestTreeItem('math', 'math', 'folder'),
                new HackTestTreeItem('random', 'random', 'folder'),
                new HackTestTreeItem('str', 'str', 'folder'),
                new HackTestTreeItem('tuple', 'tuple', 'folder'),
                new HackTestTreeItem('vec', 'vec', 'folder')
            ];
        } else if (element.id === 'str') {
            return [
                new HackTestTreeItem('str/StrCombineTest', 'StrCombineTest', 'class'),
                new HackTestTreeItem('str/StrDivideTest', 'StrDivideTest', 'class'),
                new HackTestTreeItem('str/StrFormatTest', 'StrFormatTest', 'class'),
                new HackTestTreeItem('str/StrIntrospectTest', 'StrIntrospectTest', 'class'),
                new HackTestTreeItem('str/StrSelectTest', 'StrSelectTest', 'class'),
                new HackTestTreeItem('str/StrTransformTest', 'StrTransformTest', 'class')
            ];
        } else if (element.id === 'str/StrIntrospectTest') {
            return [
                new HackTestTreeItem('str/StrIntrospectTest/testContains', 'testContains', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testPositionExceptions', 'testPositionExceptions', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testCompare', 'testCompare', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testCompareCI', 'testCompareCI', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testContainsCI', 'testContainsCI', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testContainsExceptions', 'testContainsExceptions', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testEndsWith', 'testEndsWith', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testEndsWithCI', 'testEndsWithCI', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testIsEmpty', 'testIsEmpty', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testLength', 'testLength', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testSearch', 'testSearch', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testSearchCI', 'testSearchCI', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testSearchLast', 'testSearchLast', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testStartsWith', 'testStartsWith', 'test'),
                new HackTestTreeItem('str/StrIntrospectTest/testStartsWithCI', 'testStartsWithCI', 'test')
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
        this.collapsibleState = (contextValue === 'test') ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed;
        this.contextValue = contextValue;
        if (this.contextValue === 'folder') {
            this.iconPath = vscode.ThemeIcon.Folder;
        } else if (this.contextValue === 'class') {
            this.iconPath = path.join(__filename, '..', '..', 'images', 'test_class.svg');
        } else if (this.contextValue === 'test' && (this.id === 'str/StrIntrospectTest/testContains' || this.id === 'str/StrIntrospectTest/testPositionExceptions')) {
            this.iconPath = path.join(__filename, '..', '..', 'images', 'test_fail.svg');
        } else {
            this.iconPath = path.join(__filename, '..', '..', 'images', 'test_pass.svg');
        }
    }
}
