"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const geminiService_1 = require("./geminiService");
const changeTracker_1 = require("./changeTracker");
const errorHighlighter_1 = require("./errorHighlighter");
const projectAnalyzer_1 = require("./projectAnalyzer");
const changesViewer_1 = require("./changesViewer");
let geminiService;
let changeTracker;
let errorHighlighter;
let projectAnalyzer;
let statusBarItem;
function activate(context) {
    console.log('Gemini Code Fixer is now active!');
    // Initialize services
    geminiService = new geminiService_1.GeminiService();
    changeTracker = new changeTracker_1.ChangeTracker();
    errorHighlighter = new errorHighlighter_1.ErrorHighlighter();
    projectAnalyzer = new projectAnalyzer_1.ProjectAnalyzer(geminiService, changeTracker);
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'antonys-code-fixer.revertChanges';
    statusBarItem.tooltip = 'Click to revert Antony\'s AI changes';
    // Register commands
    const fixErrorsCommand = vscode.commands.registerCommand('antonys-code-fixer.fixErrors', async () => {
        await fixCodeErrors();
    });
    const revertChangesCommand = vscode.commands.registerCommand('antonys-code-fixer.revertChanges', async () => {
        await revertChanges();
    });
    const revertAllChangesCommand = vscode.commands.registerCommand('antonys-code-fixer.revertAllChanges', async () => {
        await revertAllChanges();
    });
    const analyzeProjectCommand = vscode.commands.registerCommand('antonys-code-fixer.analyzeProject', async () => {
        await analyzeProject();
    });
    const fixProjectCommand = vscode.commands.registerCommand('antonys-code-fixer.fixProject', async () => {
        await fixProject();
    });
    const analyzeFolderCommand = vscode.commands.registerCommand('antonys-code-fixer.analyzeFolder', async (uri) => {
        await analyzeFolder(uri);
    });
    const fixFolderCommand = vscode.commands.registerCommand('antonys-code-fixer.fixFolder', async (uri) => {
        await fixFolder(uri);
    });
    const analyzeWorkspaceCommand = vscode.commands.registerCommand('antonys-code-fixer.analyzeWorkspace', async () => {
        await analyzeWorkspace();
    });
    const fixWorkspaceCommand = vscode.commands.registerCommand('antonys-code-fixer.fixWorkspace', async () => {
        await fixWorkspace();
    });
    const testAnalysisCommand = vscode.commands.registerCommand('antonys-code-fixer.testAnalysis', async () => {
        await testCurrentFileAnalysis();
    });
    // Register event listeners
    const onDidChangeActiveEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        updateContexts();
    });
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
            updateContexts();
        }
    });
    context.subscriptions.push(fixErrorsCommand, revertChangesCommand, revertAllChangesCommand, analyzeProjectCommand, fixProjectCommand, analyzeFolderCommand, fixFolderCommand, analyzeWorkspaceCommand, fixWorkspaceCommand, testAnalysisCommand, onDidChangeActiveEditor, onDidChangeTextDocument, statusBarItem);
    updateContexts();
}
exports.activate = activate;
async function fixCodeErrors() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }
    const document = editor.document;
    const selection = editor.selection;
    // Get text to analyze (selection or entire document)
    const textToAnalyze = selection.isEmpty
        ? document.getText()
        : document.getText(selection);
    const startLine = selection.isEmpty ? 0 : selection.start.line;
    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Fixing code...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            // Analyze code with Gemini
            const analysis = await geminiService.analyzeCode(textToAnalyze, document.languageId);
            progress.report({ increment: 50 });
            if (analysis.hasErrors && analysis.fixedCode) {
                // Store original content for revert functionality
                changeTracker.storeOriginalContent(document.uri, textToAnalyze, startLine);
                // Apply fixes
                await applyFixes(editor, analysis.fixedCode, selection, startLine);
                // Update context to show revert button
                updateContexts();
                // Highlight changes
                if (vscode.workspace.getConfiguration('antonys-code-fixer').get('autoHighlight')) {
                    errorHighlighter.highlightChanges(editor, analysis.changedLines || []);
                }
                // Show success message with revert option
                const changeMsg = analysis.explanation ? ` - ${analysis.explanation}` : '';
                const action = await vscode.window.showInformationMessage(`✅ Changes made${changeMsg}`, 'Revert', 'Keep');
                if (action === 'Revert') {
                    await revertChanges();
                }
            }
            else {
                // Show "Code is clean" message
                vscode.window.showInformationMessage('✅ No errors found');
            }
            progress.report({ increment: 100 });
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error fixing code: ${error}`);
    }
}
async function applyFixes(editor, fixedCode, originalSelection, startLine) {
    const document = editor.document;
    await editor.edit(editBuilder => {
        if (originalSelection.isEmpty) {
            // Replace entire document
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
            editBuilder.replace(fullRange, fixedCode);
        }
        else {
            // Replace selection
            editBuilder.replace(originalSelection, fixedCode);
        }
    });
}
async function revertChanges() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }
    const reverted = await changeTracker.revertChanges(editor);
    if (reverted) {
        errorHighlighter.clearHighlights(editor);
        updateContexts(); // Update context to hide revert button
        vscode.window.showInformationMessage('✅ Changes reverted');
    }
    else {
        vscode.window.showWarningMessage('No changes to revert');
    }
}
async function revertAllChanges() {
    const changeCount = changeTracker.getChangeCount();
    if (changeCount === 0) {
        vscode.window.showWarningMessage('No changes to revert');
        return;
    }
    const confirmation = await vscode.window.showWarningMessage(`Revert changes in ${changeCount} file(s)?`, 'Revert All', 'Cancel');
    if (confirmation !== 'Revert All') {
        return;
    }
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Reverting all changes...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            const revertedCount = await changeTracker.revertAllChanges();
            progress.report({ increment: 100 });
            // Clear all highlights
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                errorHighlighter.clearHighlights(editor);
            }
            updateContexts();
            vscode.window.showInformationMessage(`✅ Reverted ${revertedCount} file(s)`);
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error reverting changes: ${error}`);
    }
}
async function analyzeProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const workspaceFolder = workspaceFolders[0];
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning project...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Scanning files..." });
            const result = await projectAnalyzer.analyzeProject(workspaceFolder);
            progress.report({ increment: 100 });
            // Show results
            const message = `📁 ${result.totalFiles} files scanned\n` +
                `❌ ${result.filesWithErrors} files need fixes\n` +
                `🐛 ${result.totalErrors} issues found`;
            if (result.totalErrors > 0) {
                const action = await vscode.window.showInformationMessage(message, 'Fix All Errors', 'View Details');
                if (action === 'Fix All Errors') {
                    await fixProject();
                }
            }
            else {
                vscode.window.showInformationMessage(message);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error scanning project: ${error}`);
    }
}
async function fixProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const confirmation = await vscode.window.showWarningMessage('⚠️ This will modify all files in your project. Make sure you have backups!', 'Continue', 'Cancel');
    if (confirmation !== 'Continue') {
        return;
    }
    const workspaceFolder = workspaceFolders[0];
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Fixing all project errors...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Processing files..." });
            const result = await projectAnalyzer.fixProjectErrors(workspaceFolder);
            progress.report({ increment: 100 });
            // Update contexts to show any changes
            updateContexts();
            if (result.fixedFiles.length > 0) {
                // Show success message with view changes, revert and keep options
                const message = `✅ Fixed ${result.totalErrors} error(s) in ${result.fixedFiles.length} file(s)!`;
                const action = await vscode.window.showInformationMessage(message, 'View Changes', 'Revert Changes', 'Keep Changes');
                if (action === 'View Changes') {
                    if (result.changedFilesDetails) {
                        await changesViewer_1.ChangesViewer.showChangesQuickPick(result.changedFilesDetails);
                    }
                }
                else if (action === 'Revert Changes') {
                    await revertAllChanges();
                }
            }
            else if (result.totalFiles > 0) {
                // No errors found
                vscode.window.showInformationMessage('🎉 Project is clean! No errors found in any files.', { modal: false });
            }
            else {
                // No supported files found
                vscode.window.showInformationMessage('📁 No supported code files found in this project.', { modal: false });
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error fixing project: ${error}`);
    }
}
async function analyzeFolder(uri) {
    if (!uri) {
        vscode.window.showErrorMessage('No folder selected');
        return;
    }
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Scanning folder: ${vscode.workspace.asRelativePath(uri)}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            const result = await projectAnalyzer.analyzeFolder(uri);
            progress.report({ increment: 100 });
            const message = `📁 ${result.totalFiles} files scanned\n` +
                `❌ ${result.filesWithErrors} files need fixes\n` +
                `🐛 ${result.totalErrors} issues found`;
            if (result.totalErrors > 0) {
                const action = await vscode.window.showInformationMessage(message, 'Fix All Errors', 'OK');
                if (action === 'Fix All Errors') {
                    await fixFolder(uri);
                }
            }
            else {
                vscode.window.showInformationMessage(message);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error scanning folder: ${error}`);
    }
}
async function fixFolder(uri) {
    if (!uri) {
        vscode.window.showErrorMessage('No folder selected');
        return;
    }
    const confirmation = await vscode.window.showWarningMessage(`⚠️ This will modify all files in the folder: ${vscode.workspace.asRelativePath(uri)}`, 'Continue', 'Cancel');
    if (confirmation !== 'Continue') {
        return;
    }
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Fixing folder: ${vscode.workspace.asRelativePath(uri)}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Processing files..." });
            const result = await projectAnalyzer.fixFolderErrors(uri);
            progress.report({ increment: 100 });
            // Update contexts to show any changes
            updateContexts();
            if (result.fixedFiles.length > 0) {
                // Show success message with view changes, revert and keep options
                const message = `✅ Fixed ${result.totalErrors} error(s) in ${result.fixedFiles.length} file(s)!`;
                const action = await vscode.window.showInformationMessage(message, 'View Changes', 'Revert Changes', 'Keep Changes');
                if (action === 'View Changes') {
                    if (result.changedFilesDetails) {
                        await changesViewer_1.ChangesViewer.showChangesQuickPick(result.changedFilesDetails);
                    }
                }
                else if (action === 'Revert Changes') {
                    await revertAllChanges();
                }
            }
            else if (result.totalFiles > 0) {
                // No errors found
                vscode.window.showInformationMessage('🎉 Folder is clean! No errors found in any files.', { modal: false });
            }
            else {
                // No supported files found
                vscode.window.showInformationMessage('📁 No supported code files found in this folder.', { modal: false });
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error fixing folder: ${error}`);
    }
}
async function analyzeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const workspaceFolder = workspaceFolders[0];
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Scanning workspace: ${workspaceFolder.name}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Scanning workspace files..." });
            const result = await projectAnalyzer.analyzeFolder(workspaceFolder.uri);
            progress.report({ increment: 100 });
            const message = `📁 ${result.totalFiles} files scanned\n` +
                `❌ ${result.filesWithErrors} files need fixes\n` +
                `🐛 ${result.totalErrors} issues found`;
            if (result.totalErrors > 0) {
                const action = await vscode.window.showInformationMessage(message, 'Fix All Errors', 'OK');
                if (action === 'Fix All Errors') {
                    await fixWorkspace();
                }
            }
            else {
                vscode.window.showInformationMessage(message);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error scanning workspace: ${error}`);
    }
}
async function fixWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const workspaceFolder = workspaceFolders[0];
    const confirmation = await vscode.window.showWarningMessage(`⚠️ This will modify all files in the workspace root: ${workspaceFolder.name}`, 'Continue', 'Cancel');
    if (confirmation !== 'Continue') {
        return;
    }
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Fixing workspace root: ${workspaceFolder.name}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Processing workspace files..." });
            const result = await projectAnalyzer.fixFolderErrors(workspaceFolder.uri);
            progress.report({ increment: 100 });
            // Update contexts to show any changes
            updateContexts();
            if (result.fixedFiles.length > 0) {
                // Show success message with view changes, revert and keep options
                const message = `✅ Fixed ${result.totalErrors} error(s) in ${result.fixedFiles.length} file(s)!`;
                const action = await vscode.window.showInformationMessage(message, 'View Changes', 'Revert Changes', 'Keep Changes');
                if (action === 'View Changes') {
                    if (result.changedFilesDetails) {
                        await changesViewer_1.ChangesViewer.showChangesQuickPick(result.changedFilesDetails);
                    }
                }
                else if (action === 'Revert Changes') {
                    await revertAllChanges();
                }
            }
            else if (result.totalFiles > 0) {
                // No errors found
                vscode.window.showInformationMessage('🎉 Workspace is clean! No errors found in any files.', { modal: false });
            }
            else {
                // No supported files found
                vscode.window.showInformationMessage('📁 No supported code files found in this workspace.', { modal: false });
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error fixing workspace: ${error}`);
    }
}
async function testCurrentFileAnalysis() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }
    const document = editor.document;
    const code = document.getText();
    try {
        vscode.window.showInformationMessage('Testing...');
        const analysis = await geminiService.analyzeCode(code, document.languageId);
        const message = analysis.hasErrors
            ? `Changes: ${analysis.explanation || 'Code fixed'}`
            : 'No changes needed';
        vscode.window.showInformationMessage(message, { modal: true });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Test failed: ${error}`);
    }
}
function updateContexts() {
    const editor = vscode.window.activeTextEditor;
    const hasCurrentFileChanges = editor ? changeTracker.hasChanges(editor.document.uri) : false;
    const hasAnyChanges = changeTracker.hasChanges();
    const changeCount = changeTracker.getChangeCount();
    vscode.commands.executeCommand('setContext', 'antonys-code-fixer.hasChanges', hasCurrentFileChanges);
    vscode.commands.executeCommand('setContext', 'antonys-code-fixer.hasAnyChanges', hasAnyChanges);
    // Update status bar
    if (hasAnyChanges) {
        if (changeCount > 1) {
            statusBarItem.text = `$(discard) Revert AI Changes (${changeCount} files)`;
            statusBarItem.command = 'antonys-code-fixer.revertAllChanges';
            statusBarItem.tooltip = `Click to revert Antony's AI changes in ${changeCount} files`;
        }
        else {
            statusBarItem.text = '$(discard) Revert AI Changes';
            statusBarItem.command = 'antonys-code-fixer.revertChanges';
            statusBarItem.tooltip = 'Click to revert Antony\'s AI changes';
        }
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.show();
    }
    else {
        statusBarItem.hide();
    }
}
function deactivate() {
    errorHighlighter.dispose();
    statusBarItem.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map