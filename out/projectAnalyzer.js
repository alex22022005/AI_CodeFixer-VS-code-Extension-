"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectAnalyzer = void 0;
const vscode = require("vscode");
const path = require("path");
class ProjectAnalyzer {
    constructor(geminiService, changeTracker) {
        this.supportedExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
            '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m',
            '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.json'
        ];
        this.geminiService = geminiService;
        this.changeTracker = changeTracker;
    }
    async analyzeProject(workspaceFolder) {
        const files = await this.getCodeFiles(workspaceFolder.uri);
        const results = [];
        let totalErrors = 0;
        let filesWithErrors = 0;
        const fixedFiles = [];
        const skippedFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = Math.round((i / files.length) * 100);
            try {
                const result = await this.analyzeFile(file);
                results.push(result);
                if (result.hasErrors) {
                    filesWithErrors++;
                    totalErrors += result.errorCount;
                    if (result.fixedCode) {
                        fixedFiles.push(result.filePath);
                    }
                }
                else {
                    // File is clean, no action needed
                }
            }
            catch (error) {
                skippedFiles.push(file.fsPath);
                console.error(`Error analyzing ${file.fsPath}:`, error);
            }
        }
        return {
            totalFiles: files.length,
            filesWithErrors,
            totalErrors,
            fixedFiles,
            skippedFiles,
            summary: this.generateSummary(results)
        };
    }
    async analyzeFolder(folderUri) {
        const files = await this.getCodeFiles(folderUri);
        const results = [];
        let totalErrors = 0;
        let filesWithErrors = 0;
        const fixedFiles = [];
        const skippedFiles = [];
        for (const file of files) {
            try {
                const result = await this.analyzeFile(file);
                results.push(result);
                if (result.hasErrors) {
                    filesWithErrors++;
                    totalErrors += result.errorCount;
                    if (result.fixedCode) {
                        fixedFiles.push(result.filePath);
                    }
                }
            }
            catch (error) {
                skippedFiles.push(file.fsPath);
                console.error(`Error analyzing ${file.fsPath}:`, error);
            }
        }
        return {
            totalFiles: files.length,
            filesWithErrors,
            totalErrors,
            fixedFiles,
            skippedFiles,
            summary: this.generateSummary(results)
        };
    }
    async fixFolderErrors(folderUri) {
        const files = await this.getCodeFiles(folderUri);
        const results = [];
        let totalErrors = 0;
        let filesWithErrors = 0;
        const fixedFiles = [];
        const skippedFiles = [];
        const originalContents = [];
        const changedFilesDetails = [];
        // Create a map to track file URI to result mapping
        const fileResultMap = new Map();
        // First pass: analyze all files and collect original content
        for (const file of files) {
            try {
                console.log(`Analyzing file: ${file.fsPath}`);
                const result = await this.analyzeFile(file);
                console.log(`Analysis result for ${file.fsPath}:`, {
                    hasErrors: result.hasErrors,
                    errorCount: result.errorCount,
                    explanation: result.explanation
                });
                // Store the mapping between file URI and result
                fileResultMap.set(file.fsPath, { result, uri: file });
                results.push(result);
                if (result.hasErrors && result.fixedCode) {
                    console.log(`File ${file.fsPath} has errors, adding to fix list`);
                    // Store original content for revert functionality
                    originalContents.push({
                        uri: file,
                        content: result.originalCode
                    });
                    filesWithErrors++;
                    totalErrors += result.errorCount;
                    fixedFiles.push(result.filePath);
                    // Store detailed change information
                    changedFilesDetails.push({
                        filePath: result.filePath,
                        fileName: path.basename(result.filePath),
                        errorCount: result.errorCount,
                        explanation: result.explanation,
                        uri: file
                    });
                }
                else {
                    console.log(`File ${file.fsPath} has no errors or no fixed code provided`);
                }
            }
            catch (error) {
                skippedFiles.push(file.fsPath);
                console.error(`Error analyzing ${file.fsPath}:`, error);
            }
        }
        // Store batch changes for revert functionality
        if (this.changeTracker && originalContents.length > 0) {
            this.changeTracker.storeBatchChanges(originalContents);
        }
        // Second pass: apply fixes using the correct file URI mapping
        for (const [filePath, { result, uri }] of fileResultMap) {
            if (result.hasErrors && result.fixedCode) {
                try {
                    console.log(`Applying fix to file: ${filePath}`);
                    await this.applyFixToFile(uri, result.fixedCode);
                    // Also store individual change for single file revert
                    if (this.changeTracker) {
                        this.changeTracker.storeOriginalContent(uri, result.originalCode, 0);
                    }
                }
                catch (error) {
                    console.error(`Error applying fix to ${filePath}:`, error);
                    // Remove from fixed files if application failed
                    const index = fixedFiles.indexOf(result.filePath);
                    if (index > -1) {
                        fixedFiles.splice(index, 1);
                        skippedFiles.push(result.filePath);
                    }
                }
            }
        }
        return {
            totalFiles: files.length,
            filesWithErrors,
            totalErrors,
            fixedFiles,
            skippedFiles,
            summary: this.generateSummary(results),
            changedFilesDetails
        };
    }
    async fixProjectErrors(workspaceFolder) {
        const files = await this.getCodeFiles(workspaceFolder.uri);
        const results = [];
        let totalErrors = 0;
        let filesWithErrors = 0;
        const fixedFiles = [];
        const skippedFiles = [];
        const originalContents = [];
        const changedFilesDetails = [];
        // Create a map to track file URI to result mapping
        const fileResultMap = new Map();
        // First pass: analyze all files and collect original content
        for (const file of files) {
            try {
                console.log(`Analyzing file: ${file.fsPath}`);
                const result = await this.analyzeFile(file);
                console.log(`Analysis result for ${file.fsPath}:`, {
                    hasErrors: result.hasErrors,
                    errorCount: result.errorCount,
                    explanation: result.explanation
                });
                // Store the mapping between file URI and result
                fileResultMap.set(file.fsPath, { result, uri: file });
                results.push(result);
                if (result.hasErrors && result.fixedCode) {
                    console.log(`File ${file.fsPath} has errors, adding to fix list`);
                    // Store original content for revert functionality
                    originalContents.push({
                        uri: file,
                        content: result.originalCode
                    });
                    filesWithErrors++;
                    totalErrors += result.errorCount;
                    fixedFiles.push(result.filePath);
                    // Store detailed change information
                    changedFilesDetails.push({
                        filePath: result.filePath,
                        fileName: path.basename(result.filePath),
                        errorCount: result.errorCount,
                        explanation: result.explanation,
                        uri: file
                    });
                }
                else {
                    console.log(`File ${file.fsPath} has no errors or no fixed code provided`);
                }
            }
            catch (error) {
                skippedFiles.push(file.fsPath);
                console.error(`Error analyzing ${file.fsPath}:`, error);
            }
        }
        // Store batch changes for revert functionality
        if (this.changeTracker && originalContents.length > 0) {
            this.changeTracker.storeBatchChanges(originalContents);
        }
        // Second pass: apply fixes using the correct file URI mapping
        for (const [filePath, { result, uri }] of fileResultMap) {
            if (result.hasErrors && result.fixedCode) {
                try {
                    console.log(`Applying fix to file: ${filePath}`);
                    await this.applyFixToFile(uri, result.fixedCode);
                    // Also store individual change for single file revert
                    if (this.changeTracker) {
                        this.changeTracker.storeOriginalContent(uri, result.originalCode, 0);
                    }
                }
                catch (error) {
                    console.error(`Error applying fix to ${filePath}:`, error);
                    // Remove from fixed files if application failed
                    const index = fixedFiles.indexOf(result.filePath);
                    if (index > -1) {
                        fixedFiles.splice(index, 1);
                        skippedFiles.push(result.filePath);
                    }
                }
            }
        }
        return {
            totalFiles: files.length,
            filesWithErrors,
            totalErrors,
            fixedFiles,
            skippedFiles,
            summary: this.generateSummary(results),
            changedFilesDetails
        };
    }
    async analyzeFile(fileUri) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const code = document.getText();
        const languageId = document.languageId;
        const analysis = await this.geminiService.analyzeCode(code, languageId);
        return {
            filePath: fileUri.fsPath,
            hasErrors: analysis.hasErrors,
            errorCount: analysis.errorCount || 0,
            fixedCode: analysis.fixedCode,
            originalCode: code,
            explanation: analysis.explanation
        };
    }
    async applyFixToFile(fileUri, fixedCode) {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        edit.replace(fileUri, fullRange, fixedCode);
        await vscode.workspace.applyEdit(edit);
        await document.save();
    }
    async getCodeFiles(folderUri) {
        const files = [];
        const pattern = new vscode.RelativePattern(folderUri, '**/*');
        const foundFiles = await vscode.workspace.findFiles(pattern);
        for (const file of foundFiles) {
            const ext = path.extname(file.fsPath).toLowerCase();
            if (this.supportedExtensions.includes(ext)) {
                // Skip node_modules, .git, and other common ignore patterns
                const relativePath = vscode.workspace.asRelativePath(file);
                if (!this.shouldIgnoreFile(relativePath)) {
                    files.push(file);
                }
            }
        }
        return files;
    }
    shouldIgnoreFile(relativePath) {
        const ignorePaths = [
            'node_modules/',
            '.git/',
            'dist/',
            'build/',
            'out/',
            '.vscode/',
            'coverage/',
            '.nyc_output/',
            'vendor/',
            '__pycache__/',
            '.pytest_cache/',
            'target/',
            'bin/',
            'obj/'
        ];
        return ignorePaths.some(ignorePath => relativePath.includes(ignorePath));
    }
    generateSummary(results) {
        const totalFiles = results.length;
        const filesWithErrors = results.filter(r => r.hasErrors).length;
        const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
        const cleanFiles = totalFiles - filesWithErrors;
        if (totalErrors === 0) {
            return `🎉 Project is clean! All ${totalFiles} files are error-free.`;
        }
        return `📊 Analysis complete: ${totalErrors} errors found in ${filesWithErrors} files. ${cleanFiles} files are clean.`;
    }
}
exports.ProjectAnalyzer = ProjectAnalyzer;
//# sourceMappingURL=projectAnalyzer.js.map