import * as monaco from 'monaco-editor';

/**
 * Monaco Editor Configuration
 * Replaces CodeMirror with Monaco for better search UX and whitespace handling
 */

// Dark theme matching CodeMirror's #1e1e1e background
export const monacoTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'tag', foreground: '569cd6' },
    { token: 'attribute.name', foreground: '9cdcfe' },
    { token: 'attribute.value', foreground: 'ce9178' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'comment', foreground: '6a9955' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
    'editor.lineHighlightBackground': '#2d2d30',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#c6c6c6',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#3a3d41',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
  },
};

/**
 * Common editor options for both single and diff editors
 */
export const getCommonEditorOptions = (): monaco.editor.IStandaloneEditorConstructionOptions => ({
  language: 'xml',
  theme: 'custom-dark',
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineNumbers: 'on',
  folding: true,
  bracketPairColorization: {
    enabled: true,
  },
  matchBrackets: 'always',
  wordWrap: 'off',
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false, // Force consistent indentation
  useTabStops: false, // Prevent tab stops behavior
  renderWhitespace: 'none',
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
});

/**
 * Diff editor specific options
 * CRITICAL: ignoreTrimWhitespace fixes false positives from whitespace differences
 */
export const getDiffEditorOptions = (): monaco.editor.IDiffEditorConstructionOptions => ({
  ...getCommonEditorOptions(),
  renderSideBySide: true,
  ignoreTrimWhitespace: true, // ← Fixes whitespace false positives
  originalEditable: true,
  enableSplitViewResizing: true,
  renderIndicators: true,
});

/**
 * Initialize Monaco Editor
 * Call this once at application startup
 */
export const initializeMonaco = (): void => {
  // Register custom theme
  monaco.editor.defineTheme('custom-dark', monacoTheme);

  // Set default theme
  monaco.editor.setTheme('custom-dark');
};
