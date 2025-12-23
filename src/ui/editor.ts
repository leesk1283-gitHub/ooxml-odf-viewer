import { ZipHandler, type ZipNode } from '../utils/zipHandler';
import { BaseEditor } from './baseEditor';
import { EditorView, keymap } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { highlightSelectionMatches, getSearchQuery, openSearchPanel } from "@codemirror/search"
import { rectangularSelection, crosshairCursor } from "@codemirror/view"
import { getCommonExtensions } from '../lib/codemirror';
import { DESKTOP_MIN_WIDTH, FILE_EXTENSIONS } from '../const/constants';

/**
 * Editor for single file mode
 * Extends BaseEditor with single EditorView
 */
export class Editor extends BaseEditor {
    private contentArea: HTMLElement;
    private pathDisplay: HTMLElement;
    private saveBtn: HTMLButtonElement;
    private emptyState: HTMLElement;
    private editorContainer: HTMLElement;

    private currentNode: ZipNode | null = null;
    private editorView: EditorView | null = null;

    constructor(zipHandler: ZipHandler, onHoverTarget: (path: string | null) => void) {
        super(zipHandler, onHoverTarget);

        this.contentArea = document.getElementById('editor-content')!;
        this.pathDisplay = document.getElementById('current-path')!;
        this.saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
        this.emptyState = document.getElementById('empty-state')!;
        this.editorContainer = document.getElementById('editor-container')!;

        this.saveBtn.addEventListener('click', () => this.save());
    }

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
            const isXmlFile = FILE_EXTENSIONS.XML.some(ext => node.name.endsWith(ext));

            // Load relationships if it's an XML file
            if (isXmlFile) {
                await this.loadRelsFile(node.path);
            }

            const data = await this.zipHandler.getFileContent(node.path);
            this.contentArea.innerHTML = '';

            if (typeof data === 'string') {
                await this.loadTextFile(data, isXmlFile);
            } else {
                this.loadImageFile(data);
            }
        } catch (error) {
            console.error(error);
            this.contentArea.innerHTML = '<div style="color: red; text-align: center; margin-top: 20px;">Error loading file</div>';
        }
    }

    private async loadTextFile(content: string, isXmlFile: boolean) {
        let displayContent = content;

        // Format XML
        if (isXmlFile) {
            displayContent = this.formatXml(content);
        }

        const startState = EditorState.create({
            doc: displayContent,
            extensions: [
                ...getCommonExtensions(),
                highlightSelectionMatches(),
                rectangularSelection(),
                crosshairCursor(),
                this.createRelationshipTooltip(),
                keymap.of([
                    {
                        key: "Mod-s",
                        run: () => {
                            this.save();
                            return true;
                        }
                    }
                ]),
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

        // Open search panel on desktop
        if (window.innerWidth > DESKTOP_MIN_WIDTH) {
            openSearchPanel(this.editorView);
        }
    }

    private loadImageFile(data: Blob) {
        const url = URL.createObjectURL(data);
        const img = document.createElement('img');
        img.src = url;
        img.className = 'preview-image';
        this.contentArea.appendChild(img);
    }

    private updateSearchCount(view: EditorView) {
        const query = getSearchQuery(view.state);
        const panel = view.dom.querySelector('.cm-search');

        if (!panel) return;

        let countSpan = panel.querySelector('.cm-search-count') as HTMLElement;
        if (!countSpan) {
            countSpan = this.createSearchCountElement(panel);
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

    private createSearchCountElement(panel: Element): HTMLElement {
        const countSpan = document.createElement('span');
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

        const searchInput = panel.querySelector('input:not([type="checkbox"])');
        if (searchInput && searchInput.parentNode) {
            searchInput.parentNode.insertBefore(countSpan, searchInput.nextSibling);
        } else {
            panel.appendChild(countSpan);
        }

        return countSpan;
    }

    async save() {
        if (!this.currentNode || !this.editorView) return;

        const contentToSave = this.editorView.state.doc.toString();

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

    getCurrentFilePath(): string | null {
        return this.currentNode ? this.currentNode.path : null;
    }
}
