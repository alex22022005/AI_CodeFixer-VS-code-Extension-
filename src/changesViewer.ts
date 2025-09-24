import * as vscode from 'vscode';
import { ChangedFileDetail } from './projectAnalyzer';

export class ChangesViewer {
    
    static async showChangesQuickPick(changedFiles: ChangedFileDetail[]): Promise<void> {
        if (!changedFiles || changedFiles.length === 0) {
            vscode.window.showInformationMessage('No changes to view');
            return;
        }

        // Create quick pick items for files
        const fileItems: vscode.QuickPickItem[] = changedFiles.map(file => ({
            label: `$(file-code) ${file.fileName}`,
            description: `${file.errorCount} error(s) fixed`,
            detail: file.explanation || vscode.workspace.asRelativePath(file.filePath),
            // Store the file URI in the item for later use
            uri: file.uri,
            kind: vscode.QuickPickItemKind.Default
        } as vscode.QuickPickItem & { uri: vscode.Uri }));

        // Add separator and close option
        const allItems: vscode.QuickPickItem[] = [
            ...fileItems,
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            { 
                label: '$(x) Close Changes Viewer', 
                description: 'Close this viewer',
                detail: 'Exit the changes viewer',
                isCloseItem: true
            } as vscode.QuickPickItem & { isCloseItem: boolean }
        ];

        // Show quick pick
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = `📝 View Changes Made by Antony's AI (${changedFiles.length} files modified)`;
        quickPick.placeholder = 'Select a file to view changes or close the viewer...';
        quickPick.items = allItems;
        quickPick.canSelectMany = false;

        quickPick.onDidChangeSelection(async (selection) => {
            if (selection.length > 0) {
                const selectedItem = selection[0] as vscode.QuickPickItem & { uri?: vscode.Uri; isCloseItem?: boolean };
                
                if (selectedItem.isCloseItem) {
                    // Close the quick pick
                    quickPick.hide();
                } else if (selectedItem.uri) {
                    // Open the file but keep the quick pick open
                    await this.openFileAndShowChanges(selectedItem.uri);
                    
                    // Clear selection to allow selecting the same item again
                    quickPick.selectedItems = [];
                    
                    // Show a brief message that the file was opened
                    const fileName = changedFiles.find(f => f.uri.toString() === selectedItem.uri!.toString())?.fileName;
                    if (fileName) {
                        vscode.window.showInformationMessage(
                            `📍 Opened: ${fileName} - Select another file or close the viewer`,
                            { modal: false }
                        );
                    }
                }
            }
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        // Add keyboard shortcuts info
        quickPick.buttons = [
            {
                iconPath: new vscode.ThemeIcon('info'),
                tooltip: 'Tip: Select files to view changes. The viewer stays open for easy navigation.'
            }
        ];

        quickPick.show();
    }

    private static async openFileAndShowChanges(fileUri: vscode.Uri): Promise<void> {
        try {
            // Open the document
            const document = await vscode.workspace.openTextDocument(fileUri);
            
            // Show the document in editor (preserve focus to keep quick pick active)
            const editor = await vscode.window.showTextDocument(document, {
                preview: false,
                preserveFocus: true,  // Keep focus on quick pick
                viewColumn: vscode.ViewColumn.One
            });

            // Scroll to the top of the file to show changes
            const topPosition = new vscode.Position(0, 0);
            editor.selection = new vscode.Selection(topPosition, topPosition);
            editor.revealRange(new vscode.Range(topPosition, topPosition), vscode.TextEditorRevealType.AtTop);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    static async showChangesWithOptions(changedFiles: ChangedFileDetail[]): Promise<void> {
        if (!changedFiles || changedFiles.length === 0) {
            vscode.window.showInformationMessage('No changes to view');
            return;
        }

        // Ask user how they want to view changes
        const viewOption = await vscode.window.showQuickPick([
            {
                label: '$(list-unordered) Quick Pick Viewer',
                description: 'Browse files in a dropdown list',
                detail: 'Navigate through changed files with keyboard/mouse. Stays open for easy browsing.',
                option: 'quickpick'
            },
            {
                label: '$(browser) Side Panel Viewer',
                description: 'Open changes in a side panel',
                detail: 'View all changes in a dedicated panel with clickable file list.',
                option: 'webview'
            }
        ], {
            placeHolder: 'How would you like to view the changes?',
            title: '📝 Choose Changes Viewer'
        });

        if (!viewOption) {
            return; // User cancelled
        }

        if (viewOption.option === 'webview') {
            await this.showChangesWebView(changedFiles);
        } else {
            await this.showChangesQuickPick(changedFiles);
        }
    }

    static async showChangesWebView(changedFiles: ChangedFileDetail[]): Promise<void> {
        if (!changedFiles || changedFiles.length === 0) {
            vscode.window.showInformationMessage('No changes to view');
            return;
        }

        // Create and show webview panel
        const panel = vscode.window.createWebviewPanel(
            'antonysChangesViewer',
            '📝 Changes Made by Antony\'s AI',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Generate HTML content
        panel.webview.html = this.getWebviewContent(changedFiles);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'openFile':
                        const fileUri = vscode.Uri.file(message.filePath);
                        await this.openFileAndShowChanges(fileUri);
                        break;
                }
            }
        );
    }

    private static getWebviewContent(changedFiles: ChangedFileDetail[]): string {
        const filesList = changedFiles.map(file => `
            <div class="file-item" onclick="openFile('${file.filePath}')">
                <div class="file-header">
                    <span class="file-icon">📄</span>
                    <span class="file-name">${file.fileName}</span>
                    <span class="error-count">${file.errorCount} error(s) fixed</span>
                </div>
                <div class="file-path">${vscode.workspace.asRelativePath(file.filePath)}</div>
                ${file.explanation ? `<div class="file-explanation">${file.explanation}</div>` : ''}
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Changes Made by Antony's AI</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    
                    .header {
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .header h1 {
                        margin: 0;
                        color: var(--vscode-textLink-foreground);
                    }
                    
                    .summary {
                        margin-bottom: 20px;
                        padding: 10px;
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textLink-foreground);
                    }
                    
                    .file-item {
                        margin-bottom: 15px;
                        padding: 15px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 5px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }
                    
                    .file-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    
                    .file-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 5px;
                    }
                    
                    .file-icon {
                        margin-right: 8px;
                        font-size: 16px;
                    }
                    
                    .file-name {
                        font-weight: bold;
                        flex-grow: 1;
                        color: var(--vscode-textLink-foreground);
                    }
                    
                    .error-count {
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 12px;
                    }
                    
                    .file-path {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 5px;
                    }
                    
                    .file-explanation {
                        font-size: 13px;
                        color: var(--vscode-foreground);
                        font-style: italic;
                    }
                    
                    .no-changes {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        margin-top: 50px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📝 Changes Made by Antony's AI</h1>
                </div>
                
                <div class="summary">
                    <strong>Summary:</strong> ${changedFiles.length} file(s) were modified with a total of ${changedFiles.reduce((sum, f) => sum + f.errorCount, 0)} error(s) fixed.
                </div>
                
                <div class="files-list">
                    ${filesList}
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function openFile(filePath) {
                        vscode.postMessage({
                            command: 'openFile',
                            filePath: filePath
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
}