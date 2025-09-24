"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const vscode = require("vscode");
const generative_ai_1 = require("@google/generative-ai");
class GeminiService {
    constructor() {
        this.genAI = null;
    }
    initializeAPI() {
        const config = vscode.workspace.getConfiguration('antonys-code-fixer');
        const apiKey = config.get('apiKey');
        if (!apiKey || apiKey.trim() === '') {
            vscode.window.showErrorMessage('🔑 Gemini API key is required! Please get your free API key from Google AI Studio and configure it in settings.', 'Get API Key', 'Open Settings').then(selection => {
                if (selection === 'Get API Key') {
                    vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
                }
                else if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'antonys-code-fixer.apiKey');
                }
            });
            return false;
        }
        // Basic validation of API key format
        if (!apiKey.startsWith('AIza') || apiKey.length < 35) {
            vscode.window.showErrorMessage('❌ Invalid Gemini API key format. Please check your API key.', 'Get New API Key', 'Open Settings').then(selection => {
                if (selection === 'Get New API Key') {
                    vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
                }
                else if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'antonys-code-fixer.apiKey');
                }
            });
            return false;
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        return true;
    }
    async analyzeCode(code, languageId) {
        console.log(`GeminiService: Analyzing ${languageId} code with ${code.length} characters`);
        if (!this.initializeAPI()) {
            throw new Error('Gemini API not initialized');
        }
        const config = vscode.workspace.getConfiguration('antonys-code-fixer');
        const model = config.get('model') || 'gemini-1.5-flash';
        const genModel = this.genAI.getGenerativeModel({ model });
        const prompt = this.buildPrompt(code, languageId);
        console.log(`GeminiService: Sending prompt to ${model}`);
        try {
            const result = await genModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log(`GeminiService: Received response:`, text.substring(0, 200) + '...');
            const analysis = this.parseResponse(text, code);
            console.log(`GeminiService: Parsed analysis:`, {
                hasErrors: analysis.hasErrors,
                errorCount: analysis.errorCount,
                hasFixedCode: !!analysis.fixedCode
            });
            return analysis;
        }
        catch (error) {
            console.error(`GeminiService: API error:`, error);
            throw new Error(`Gemini API error: ${error}`);
        }
    }
    buildPrompt(code, languageId) {
        const commentStyle = this.getCommentStyle(languageId);
        return `Check this ${languageId} code for syntax errors, missing semicolons, undefined variables, and fix them.

IMPORTANT: Add ${commentStyle} comments next to each line you fix to show what was changed.
Example: 
- If you add a semicolon: ${commentStyle} Added semicolon
- If you fix a bracket: ${commentStyle} Added closing bracket
- If you define a variable: ${commentStyle} Defined missing variable

Return JSON:
{
    "hasErrors": boolean,
    "errorCount": number,
    "fixedCode": "complete corrected code with comments showing changes",
    "changedLines": [line numbers changed],
    "explanation": "what was fixed"
}

CODE:
\`\`\`${languageId}
${code}
\`\`\`

Look carefully for: missing semicolons, undefined variables, syntax errors, missing brackets.
Add comments to show what you fixed on each line.`;
    }
    getCommentStyle(languageId) {
        switch (languageId.toLowerCase()) {
            case 'python':
            case 'ruby':
            case 'bash':
            case 'shell':
                return '#';
            case 'html':
            case 'xml':
                return '<!--';
            case 'css':
                return '/*';
            default:
                return '//';
        }
    }
    parseResponse(response, originalCode) {
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate response structure
            if (typeof parsed.hasErrors !== 'boolean') {
                throw new Error('Invalid response format');
            }
            // If no errors, return simple response
            if (!parsed.hasErrors) {
                return {
                    hasErrors: false,
                    errorCount: 0
                };
            }
            // Validate fixed code exists when errors are found
            if (!parsed.fixedCode) {
                throw new Error('Fixed code not provided despite errors being found');
            }
            return {
                hasErrors: parsed.hasErrors,
                errorCount: parsed.errorCount || 0,
                fixedCode: parsed.fixedCode,
                changedLines: parsed.changedLines || [],
                explanation: parsed.explanation || 'Code errors fixed'
            };
        }
        catch (error) {
            // Fallback: try to extract code blocks if JSON parsing fails
            const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
            if (codeBlockMatch && codeBlockMatch[1] !== originalCode.trim()) {
                return {
                    hasErrors: true,
                    errorCount: 1,
                    fixedCode: codeBlockMatch[1],
                    changedLines: [],
                    explanation: 'Code fixed (fallback parsing)'
                };
            }
            throw new Error(`Failed to parse Gemini response: ${error}`);
        }
    }
}
exports.GeminiService = GeminiService;
//# sourceMappingURL=geminiService.js.map