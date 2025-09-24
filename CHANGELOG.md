# Change Log

## [1.4.1] - 2025-01-25

### Added Change Comments
- **Inline Comments**: Extension now adds comments next to each line that was changed
- **Clear Change Indicators**: Shows exactly what was fixed (e.g., "// Added semicolon")
- **Language-Specific Comments**: Uses correct comment syntax for each programming language
- **Visual Change Tracking**: Users can easily see what the AI modified in their code

## [1.4.0] - 2025-01-25

### Fixed Error Detection
- **Improved Prompt**: Enhanced AI prompt to better detect syntax errors
- **Better Error Detection**: Now properly detects missing semicolons, brackets, and syntax issues
- **More Obvious Test Errors**: Updated test files with clearer errors for better testing
- **Enhanced Accuracy**: AI now correctly identifies and fixes common coding errors

## [1.3.9] - 2025-01-25

### Clean Test Files
- **Removed Unnecessary Comments**: Cleaned up all test files by removing explanatory comments
- **Pure Code Only**: Test files now contain only the actual code without prompts or explanations
- **Cleaner Examples**: Sample files show clean code without analysis comments
- **Focus on Changes**: Only actual code changes remain, no meta-commentary

## [1.3.8] - 2025-01-25

### Change-Focused Experience
- **Changes Only**: Extension now shows only what was actually changed
- **No Analysis Details**: Removed all analysis explanations and technical details
- **Direct Results**: Users see immediate changes without unnecessary information
- **Streamlined Messages**: All messages focus on changes made, not code analysis

## [1.3.7] - 2025-01-25

### User Experience Improvements
- **Simplified Prompts**: Streamlined AI prompts for faster processing
- **Cleaner Messages**: Shortened user-facing messages for better readability
- **Focused Output**: AI now provides only essential information about changes
- **Reduced Verbosity**: Removed unnecessary explanations and technical details

## [1.3.6] - 2025-01-25

### Security & Bug Fixes
- **CRITICAL SECURITY FIX**: Removed hardcoded API key from extension package
- **API Key Validation**: Added proper API key format validation
- **Enhanced Error Messages**: Improved error messages when API key is missing or invalid
- **Setup Instructions**: Updated README with clearer setup instructions
- **User Experience**: Added direct links to Google AI Studio for API key generation

### Important Notes
- **Breaking Change**: Users must now configure their own Gemini API key
- **Each user needs their own free API key** from Google AI Studio
- This fixes the issue where the extension wasn't working for other users

## [1.3.0] - 2025-01-25

### Added
- **View Changes Feature**: Added "View Changes" button in acknowledgement popups for folder/project operations
- **Interactive Changes Viewer**: Quick pick interface to browse and open changed files
- **File Navigation**: Click on any changed file to open it and view the modifications
- **Detailed Change Information**: Shows file names, error counts, and explanations for each changed file
- **Enhanced User Experience**: Easy discovery of what files were modified and where changes occurred

### Improved
- **Popup Options**: All fixing operations now show "View Changes", "Revert Changes", and "Keep Changes" options
- **Better Change Tracking**: Enhanced ProjectAnalyzer to track detailed information about each changed file
- **File Opening**: Automatically opens files at the top to show changes when selected from the viewer
- **Visual Feedback**: Shows temporary messages when viewing changes in specific files

### Technical
- **New ChangesViewer Class**: Dedicated class for handling change visualization and file navigation
- **Enhanced ProjectAnalysisResult**: Added `changedFilesDetails` with comprehensive change information
- **Quick Pick Integration**: Native VS Code quick pick interface for seamless user experience
- **File URI Handling**: Proper file URI management for reliable file opening and navigation

## [1.2.0] - 2025-01-25

### Added
- **Root Workspace Support**: Added support for analyzing and fixing files in the root workspace folder
- **New Workspace Commands**: Added "Analyze Workspace Root" and "Fix All Workspace Errors" commands
- **Enhanced Explorer Integration**: Added workspace commands to explorer view title and context menus
- **Root Folder Context Menu**: Right-click on workspace root now shows workspace-specific commands

### Improved
- **Better Menu Organization**: Separated workspace root operations from subfolder operations
- **Enhanced Command Palette**: Added workspace commands to command palette for easy access
- **Consistent User Experience**: Workspace operations follow the same popup pattern as folder operations

### Technical
- **New Command Registration**: Added `analyzeWorkspace` and `fixWorkspace` commands
- **Enhanced Menu Configuration**: Added support for `explorerResourceIsRoot` context
- **View Title Integration**: Added workspace commands to explorer view title for quick access

## [1.1.1] - 2025-01-25

### Fixed
- **Popup Revert Options**: Fixed folder and project fixing to show popup dialogs with revert options
- **Consistent User Experience**: All fixing operations now show the same "Revert Changes" / "Keep Changes" popup
- **Immediate Revert**: Users can now immediately revert changes after folder/project fixing

## [1.1.0] - 2025-01-25

### Fixed
- **Folder Error Fixing**: Fixed critical issue where folder error fixing was not actually applying changes to files
- **Revert Button**: Fixed missing revert button functionality for folder and project operations
- **Change Tracking**: Improved change tracking system to properly handle multiple file operations
- **Status Bar**: Enhanced status bar to show number of files with changes and appropriate revert commands

### Added
- **Batch Revert**: New "Revert All Changes" command for reverting changes across multiple files
- **Enhanced Change Tracking**: Better tracking of original content for reliable revert functionality
- **Improved Status Bar**: Dynamic status bar that shows file count and switches between single/batch revert commands
- **Better Error Handling**: More robust error handling during file analysis and fixing operations

### Improved
- **Project Analyzer**: Enhanced to properly store original content before applying fixes
- **Folder Operations**: Now correctly applies fixes to files instead of just analyzing them
- **User Feedback**: Better progress reporting and success/error messages
- **Code Structure**: Cleaner separation of analysis and fixing operations

## [1.0.0] - 2025-01-25

### Added
- Initial release of Antony's Code Fixer (renamed from Gemini Code Fixer)
- AI-powered code error detection using Gemini API
- Automatic code fixing with highlighted changes
- One-click revert functionality
- Support for all programming languages
- Context menu integration
- Editor title bar commands
- Configurable Gemini model selection
- Auto-highlight changed lines feature
- Project-wide analysis and fixing capabilities
- Folder-specific analysis and fixing

### Features
- Analyze entire files or selected code sections
- Visual highlighting of fixed code lines
- Temporary storage of original code for easy revert
- Integration with VS Code's command palette
- Right-click context menu support
- Automatic cleanup of old changes
- Multi-level analysis: single files, folders, and entire projects

### Configuration
- Gemini API key configuration
- Model selection (gemini-1.5-flash, gemini-1.5-pro)
- Auto-highlight toggle option