import { ZipHandler, type ZipNode } from '../utils/zipHandler';
import xmlFormatter from 'xml-formatter';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, hoverTooltip } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { foldGutter, indentOnInput, syntaxHighlighting, bracketMatching, foldKeymap, defaultHighlightStyle, HighlightStyle } from "@codemirror/language"
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches, search, getSearchQuery, openSearchPanel } from "@codemirror/search"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { xml } from "@codemirror/lang-xml"
import { tags as t } from "@lezer/highlight"

// Custom Theme
const myTheme = EditorView.theme({
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
}, { dark: true })

const myHighlightStyle = HighlightStyle.define([
    { tag: t.angleBracket, color: "#e02275" },
    { tag: t.tagName, color: "#e06275" },
    { tag: t.attributeName, color: "#98c379" },
    { tag: t.attributeValue, color: "#e5c07b" },
    { tag: t.string, color: "#e5c07b" },
    { tag: t.comment, color: "#5c6370", fontStyle: "italic" },
    { tag: t.content, color: "#abb2bf" }
])

export class Editor {
    private contentArea: HTMLElement;
    private pathDisplay: HTMLElement;
    private saveBtn: HTMLButtonElement;
    private emptyState: HTMLElement;
    private editorContainer: HTMLElement;

    private currentNode: ZipNode | null = null;
    private zipHandler: ZipHandler;
    private editorView: EditorView | null = null;
    private relsMap: Map<string, string> = new Map();
    private onHoverTarget: (path: string | null) => void;

    constructor(zipHandler: ZipHandler, onHoverTarget: (path: string | null) => void) {
        this.contentArea = document.getElementById('editor-content')!;
        this.pathDisplay = document.getElementById('current-path')!;
        this.saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
        this.emptyState = document.getElementById('empty-state')!;
        this.editorContainer = document.getElementById('editor-container')!;
        this.zipHandler = zipHandler;
        this.onHoverTarget = onHoverTarget;

        this.saveBtn.addEventListener('click', () => this.save());
    }

    private async loadRelsFile(xmlPath: string) {
        this.relsMap.clear();
        const parts = xmlPath.split('/');
        const fileName = parts.pop();
        const folder = parts.join('/');

        // Construct .rels path: folder/_rels/fileName.rels
        // If file is at root, folder is empty string
        const relsFolder = folder ? `${folder}/_rels` : '_rels';
        const relsPath = `${relsFolder}/${fileName}.rels`;

        try {
            const content = await this.zipHandler.getFileContent(relsPath);
            if (typeof content === 'string') {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, "text/xml");
                const relationships = xmlDoc.getElementsByTagName("Relationship");

                for (let i = 0; i < relationships.length; i++) {
                    const rel = relationships[i];
                    const id = rel.getAttribute("Id");
                    const target = rel.getAttribute("Target");

                    if (id && target) {
                        let resolvedPath = target;

                        // Resolve relative paths
                        if (!target.startsWith('/') && !target.startsWith('http') && !target.includes(':')) {
                            const currentDirParts = folder ? folder.split('/') : [];
                            const targetParts = target.split('/');

                            for (const part of targetParts) {
                                if (part === '..') {
                                    currentDirParts.pop();
                                } else if (part !== '.') {
                                    currentDirParts.push(part);
                                }
                            }
                            resolvedPath = currentDirParts.join('/');
                        }

                        // Remove leading slash if present
                        if (resolvedPath.startsWith('/')) {
                            resolvedPath = resolvedPath.substring(1);
                        }

                        this.relsMap.set(id, resolvedPath);
                    }
                }
                console.log(`[Debug] Loaded ${this.relsMap.size} relationships from ${relsPath}`, this.relsMap);
            }
        } catch (e) {
            // .rels file might not exist, which is fine
            console.log(`[Debug] No .rels file found for ${xmlPath}`);
        }
    }

    private relationshipTooltip = hoverTooltip((view, pos) => {
        const { from, to, text } = view.state.doc.lineAt(pos);
        let start = pos, end = pos;
        while (start > from && /\w/.test(text[start - from - 1])) start--;
        while (end < to && /\w/.test(text[end - from])) end++;

        if (start == end) return null;

        const word = text.slice(start - from, end - from);
        const target = this.relsMap.get(word);

        if (target) {
            console.log(`[Debug] Hovered: ${word}, Target: ${target}`);
            return {
                pos: start,
                end,
                above: true,
                create: () => {
                    this.onHoverTarget(target);
                    const dom = document.createElement("div");
                    dom.textContent = `Target: ${target}`;

                    // Return an object with dom and destroy method
                    return {
                        dom,
                        destroy: () => {
                            this.onHoverTarget(null);
                        }
                    };
                }
            };
        }
        return null;
    });

    async loadFile(node: ZipNode) {
        this.currentNode = node;
        this.pathDisplay.textContent = node.path;
        this.emptyState.classList.add('hidden');
        this.editorContainer.classList.remove('hidden');
        this.contentArea.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">Loading...</div>';
        this.saveBtn.disabled = true;

        if (this.editorView) {
            this.editorView.destroy();
            this.editorView = null;
        }

        try {
            // Load relationships if it's an XML file
            if (node.name.endsWith('.xml')) {
                await this.loadRelsFile(node.path);
            }

            const data = await this.zipHandler.getFileContent(node.path);

            this.contentArea.innerHTML = '';

            if (typeof data === 'string') {
                let displayContent = data;
                try {
                    if (node.name.endsWith('.xml') || node.name.endsWith('.rels')) {
                        displayContent = xmlFormatter(data, {
                            indentation: '  ',
                            collapseContent: true,
                            lineSeparator: '\n'
                        });
                    }
                } catch (e) {
                    // Ignore format error
                }

                const startState = EditorState.create({
                    doc: displayContent,
                    extensions: [
                        lineNumbers(),
                        highlightActiveLineGutter(),
                        highlightSpecialChars(),
                        history(),
                        // Custom Fold Gutter
                        foldGutter({
                            markerDOM: (open) => {
                                const span = document.createElement("span");
                                span.style.cursor = "pointer";
                                span.style.display = "flex";
                                span.style.alignItems = "center";
                                span.style.justifyContent = "center";
                                span.style.width = "16px"; // Increased width
                                span.style.height = "100%";

                                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                svg.setAttribute("width", "17"); // Increased size
                                svg.setAttribute("height", "17"); // Increased size
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
                        }),
                        drawSelection(),
                        dropCursor(),
                        EditorState.allowMultipleSelections.of(true),
                        indentOnInput(),
                        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                        bracketMatching(),
                        closeBrackets(),
                        autocompletion(),
                        rectangularSelection(),
                        crosshairCursor(),
                        highlightActiveLine(),
                        highlightSelectionMatches(),
                        search({ top: true }), // Enable search panel with match count
                        this.relationshipTooltip, // Add tooltip extension
                        keymap.of([
                            ...closeBracketsKeymap,
                            ...defaultKeymap,
                            ...searchKeymap,
                            ...historyKeymap,
                            ...foldKeymap,
                            ...completionKeymap,
                            ...lintKeymap,
                            // Save Shortcut
                            {
                                key: "Mod-s",
                                run: () => {
                                    this.save();
                                    return true;
                                }
                            }
                        ]),
                        xml(),
                        myTheme,
                        syntaxHighlighting(myHighlightStyle),
                        EditorView.updateListener.of((update) => {
                            if (update.docChanged) {
                                this.saveBtn.disabled = false;
                            }
                            this.updateSearchCount(update.view);
                        })
                    ]
                });

                this.editorView = new EditorView({
                    state: startState,
                    parent: this.contentArea
                });

                // 검색 패널을 항상 표시
                openSearchPanel(this.editorView);

            } else {
                const url = URL.createObjectURL(data);
                const img = document.createElement('img');
                img.src = url;
                img.className = 'preview-image';
                this.contentArea.appendChild(img);
            }
        } catch (error) {
            console.error(error);
            this.contentArea.innerHTML = '<div style="color: red; text-align: center; margin-top: 20px;">Error loading file</div>';
        }
    }

    private updateSearchCount(view: EditorView) {
        const query = getSearchQuery(view.state);
        const panel = view.dom.querySelector('.cm-search');

        if (!panel) return;

        let countSpan = panel.querySelector('.cm-search-count') as HTMLElement;
        if (!countSpan) {
            countSpan = document.createElement('span');
            countSpan.className = 'cm-search-count';
            countSpan.style.marginLeft = '8px';
            countSpan.style.fontWeight = 'bold';
            countSpan.style.color = '#60a5fa';
            countSpan.style.fontSize = '14px';
            countSpan.style.padding = '4px 8px';
            countSpan.style.backgroundColor = '#1f2937';
            countSpan.style.borderRadius = '4px';
            countSpan.style.border = '1px solid #4b5563';
            countSpan.style.minWidth = '110px';
            countSpan.style.textAlign = 'center';
            countSpan.style.display = 'inline-block';

            // Insert after the first input (search input)
            const searchInput = panel.querySelector('input:not([type="checkbox"])');
            if (searchInput && searchInput.parentNode) {
                searchInput.parentNode.insertBefore(countSpan, searchInput.nextSibling);
            } else {
                panel.appendChild(countSpan);
            }
        }

        if (!query.search) {
            countSpan.textContent = '';
            countSpan.style.display = 'none';
            return;
        }

        let count = 0;
        const cursor = query.getCursor(view.state.doc);
        while (!cursor.next().done) {
            count++;
            if (count > 999) {
                countSpan.textContent = '999+';
                countSpan.style.display = 'inline-block';
                return;
            }
        }

        countSpan.textContent = count > 0 ? `${count} matches` : 'No matches';
        countSpan.style.display = 'inline-block';
    }

    async save() {
        if (!this.currentNode) return;

        let contentToSave: string | null = null;

        if (this.editorView) {
            contentToSave = this.editorView.state.doc.toString();
        }

        if (contentToSave === null) return;

        try {
            await this.zipHandler.updateFile(this.currentNode.path, contentToSave);
            this.saveBtn.disabled = true;
            alert('Saved internally!');
        } catch (error) {
            console.error(error);
            alert('Failed to save');
        }
    }

    reset() {
        this.currentNode = null;
        if (this.editorView) {
            this.editorView.destroy();
            this.editorView = null;
        }
        this.emptyState.classList.remove('hidden');
        this.editorContainer.classList.add('hidden');
    }
}
