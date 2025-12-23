import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, highlightActiveLine, keymap } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { foldGutter, indentOnInput, syntaxHighlighting, bracketMatching, foldKeymap, defaultHighlightStyle, HighlightStyle } from "@codemirror/language"
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands"
import { searchKeymap, search } from "@codemirror/search"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { xml } from "@codemirror/lang-xml"
import { tags as t } from "@lezer/highlight"

/**
 * Dark theme for CodeMirror
 */
export const editorTheme = EditorView.theme({
    "&": {
        color: "#e0e0e0",
        backgroundColor: "#1e1e1e",
        height: "100%",
        fontSize: "14px",
        fontFamily: "'Menlo', 'Consolas', 'Monaco', 'Liberation Mono', 'Lucida Console', monospace"
    },
    ".cm-foldPlaceholder": {
        backgroundColor: "transparent",
        border: "none",
        color: "#e0e0e0"
    },
    ".cm-content": {
        caretColor: "#aeafad"
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "#aeafad"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "#3E4451"
    },
    ".cm-gutters": {
        backgroundColor: "#1e1e1e",
        color: "#5c6370",
        border: "none"
    },
    // Search Panel Styles
    ".cm-search": {
        backgroundColor: "#2c313a",
        color: "#ffffff",
        border: "1px solid #4b5563",
        borderRadius: "6px",
        padding: "6px 12px",
        fontWeight: "bold",
        fontSize: "15px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
        maxWidth: "100%"
    },
    ".cm-search input:not([type='checkbox'])": {
        backgroundColor: "#1f2937",
        color: "#e0e0e0",
        border: "1px solid #4b5563",
        borderRadius: "4px",
        padding: "6px 10px",
        fontSize: "15px",
        minWidth: "200px"
    },
    ".cm-search button": {
        color: "#e0e0e0",
        cursor: "pointer",
        fontWeight: "bold",
        padding: "4px 8px",
        fontSize: "13px",
        backgroundColor: "#374151",
        border: "1px solid #4b5563",
        borderRadius: "4px",
        textTransform: "capitalize"
    },
    ".cm-search button:hover": {
        backgroundColor: "#4b5563"
    },
    ".cm-search label": {
        color: "#e0e0e0",
        fontWeight: "bold",
        fontSize: "13px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        whiteSpace: "nowrap",
        cursor: "pointer"
    },
    ".cm-search input[type='checkbox']": {
        margin: "0",
        cursor: "pointer"
    },
    // Tooltip Styles
    ".cm-tooltip": {
        backgroundColor: "#2c313a",
        color: "#e0e0e0",
        border: "1px solid #4b5563",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "12px",
        zIndex: "100"
    }
}, { dark: true });

/**
 * Syntax highlighting style for XML
 */
export const xmlHighlightStyle = HighlightStyle.define([
    { tag: t.angleBracket, color: "#e02275" },
    { tag: t.tagName, color: "#e06275" },
    { tag: t.attributeName, color: "#98c379" },
    { tag: t.attributeValue, color: "#e5c07b" },
    { tag: t.string, color: "#e5c07b" },
    { tag: t.comment, color: "#5c6370", fontStyle: "italic" },
    { tag: t.content, color: "#abb2bf" }
]);

/**
 * Custom fold gutter marker
 */
export function createFoldMarker(open: boolean): HTMLElement {
    const span = document.createElement("span");
    span.style.cursor = "pointer";
    span.style.display = "flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.width = "16px";
    span.style.height = "100%";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "17");
    svg.setAttribute("height", "17");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("fill", "#9ca3af");

    if (open) {
        // Down Arrow
        svg.innerHTML = '<path d="M7 10l5 5 5-5z" />';
    } else {
        // Right Arrow
        svg.innerHTML = '<path d="M10 17l5-5-5-5z" />';
    }

    span.appendChild(svg);
    return span;
}

/**
 * Get common editor extensions
 */
export function getCommonExtensions(options?: { excludeSearch?: boolean }) {
    const extensions = [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter({
            markerDOM: createFoldMarker
        }),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        xml(),
        editorTheme,
        syntaxHighlighting(xmlHighlightStyle)
    ];

    if (!options?.excludeSearch) {
        extensions.push(
            search({ top: true }),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...lintKeymap
            ])
        );
    } else {
        extensions.push(
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...lintKeymap
            ])
        );
    }

    return extensions;
}
