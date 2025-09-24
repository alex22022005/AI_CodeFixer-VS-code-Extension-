import * as vscode from 'vscode';

export class ErrorHighlighter {
    private decorationType: vscode.TextEditorDecorationType;
    private activeDecorations: Map<string, vscode.Range[]> = new Map();

    constructor() {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
            isWholeLine: true,
            overviewRulerColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' ✨ Fixed by Antony\'s AI',
                color: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
                fontStyle: 'italic',
                fontWeight: 'bold',
                margin: '0 0 0 1em'
            }
        });
    }

    highlightChanges(editor: vscode.TextEditor, changedLines: number[]): void {
        if (changedLines.length === 0) {
            return;
        }

        const ranges: vscode.Range[] = [];
        
        for (const lineNumber of changedLines) {
            // Convert to 0-based line number and create range
            const line = Math.max(0, lineNumber - 1);
            if (line < editor.document.lineCount) {
                const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);
                ranges.push(range);
            }
        }

        // Store decorations for this editor
        const key = editor.document.uri.toString();
        this.activeDecorations.set(key, ranges);

        // Apply decorations
        editor.setDecorations(this.decorationType, ranges);

        // Auto-clear decorations after 15 seconds
        setTimeout(() => {
            this.clearHighlights(editor);
        }, 15000);
    }

    clearHighlights(editor: vscode.TextEditor): void {
        const key = editor.document.uri.toString();
        editor.setDecorations(this.decorationType, []);
        this.activeDecorations.delete(key);
    }

    clearAllHighlights(): void {
        // Clear all active decorations
        vscode.window.visibleTextEditors.forEach(editor => {
            this.clearHighlights(editor);
        });
    }

    dispose(): void {
        this.decorationType.dispose();
        this.activeDecorations.clear();
    }
}