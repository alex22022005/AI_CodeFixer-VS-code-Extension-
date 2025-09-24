"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeTracker = void 0;
const vscode = require("vscode");
class ChangeTracker {
    constructor() {
        this.changes = new Map();
        this.batchChanges = new Map(); // For batch operations
    }
    storeOriginalContent(uri, content, startLine) {
        const key = uri.toString();
        this.changes.set(key, {
            originalContent: content,
            startLine,
            timestamp: Date.now()
        });
    }
    storeBatchChanges(changes) {
        const batchId = `batch_${Date.now()}`;
        const storedChanges = [];
        for (const change of changes) {
            const storedChange = {
                originalContent: change.content,
                startLine: 0,
                timestamp: Date.now()
            };
            storedChanges.push(storedChange);
            // Also store individual changes for single file revert
            this.storeOriginalContent(change.uri, change.content, 0);
        }
        this.batchChanges.set(batchId, storedChanges);
    }
    hasChanges(uri) {
        if (uri) {
            return this.changes.has(uri.toString());
        }
        // Check if any changes exist
        return this.changes.size > 0 || this.batchChanges.size > 0;
    }
    async revertChanges(editor) {
        const key = editor.document.uri.toString();
        const storedChange = this.changes.get(key);
        if (!storedChange) {
            return false;
        }
        try {
            await editor.edit(editBuilder => {
                if (storedChange.startLine === 0) {
                    // Revert entire document
                    const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
                    editBuilder.replace(fullRange, storedChange.originalContent);
                }
                else {
                    // Revert specific section (this is more complex and would need better tracking)
                    // For now, we'll handle full document reverts
                    const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
                    editBuilder.replace(fullRange, storedChange.originalContent);
                }
            });
            // Remove the stored change after successful revert
            this.changes.delete(key);
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to revert changes: ${error}`);
            return false;
        }
    }
    async revertAllChanges() {
        let revertedCount = 0;
        const changeEntries = Array.from(this.changes.entries());
        for (const [uriString, storedChange] of changeEntries) {
            try {
                const uri = vscode.Uri.parse(uriString);
                const document = await vscode.workspace.openTextDocument(uri);
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                edit.replace(uri, fullRange, storedChange.originalContent);
                const success = await vscode.workspace.applyEdit(edit);
                if (success) {
                    await document.save();
                    this.changes.delete(uriString);
                    revertedCount++;
                }
            }
            catch (error) {
                console.error(`Failed to revert ${uriString}:`, error);
            }
        }
        // Clear batch changes
        this.batchChanges.clear();
        return revertedCount;
    }
    clearChanges(uri) {
        this.changes.delete(uri.toString());
    }
    clearAllChanges() {
        this.changes.clear();
        this.batchChanges.clear();
    }
    getChangeCount() {
        return this.changes.size;
    }
    // Clean up old changes (older than 1 hour)
    cleanup() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, change] of this.changes.entries()) {
            if (change.timestamp < oneHourAgo) {
                this.changes.delete(key);
            }
        }
        for (const [key, changes] of this.batchChanges.entries()) {
            if (changes.length > 0 && changes[0].timestamp < oneHourAgo) {
                this.batchChanges.delete(key);
            }
        }
    }
}
exports.ChangeTracker = ChangeTracker;
//# sourceMappingURL=changeTracker.js.map