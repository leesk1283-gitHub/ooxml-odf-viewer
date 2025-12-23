import { ZipHandler } from '../utils/zipHandler';
import type { MergedZipNode } from '../types/diff';
import { BaseEditor } from './baseEditor';
import { EditorView } from "@codemirror/view"
import { MergeView } from "@codemirror/merge"
import { getCommonExtensions } from '../lib/codemirror';
import { FILE_EXTENSIONS } from '../const/constants';
import { createElement } from '../utils/domUtils';
import { openSearchPanel, closeSearchPanel, search } from "@codemirror/search";
import { keymap } from "@codemirror/view";

/**
 * DiffEditor for comparing two files side-by-side
 * Extends BaseEditor with MergeView and dual zipHandlers
 */
export class DiffEditor extends BaseEditor {
    private contentArea: HTMLElement;
    private pathDisplay: HTMLElement;
    private saveLeftBtn: HTMLButtonElement;
    private saveRightBtn: HTMLButtonElement;
    private emptyState: HTMLElement;
    private editorContainer: HTMLElement;

    private currentNode: MergedZipNode | null = null;
    private rightZipHandler: ZipHandler;
    private mergeView: MergeView | null = null;
    private leftEditor: EditorView | null = null;
    private rightEditor: EditorView | null = null;
    private rightRelsMap: Map<string, string> = new Map();

    constructor(leftZipHandler: ZipHandler, rightZipHandler: ZipHandler, onHoverTarget: (path: string | null) => void) {
        super(leftZipHandler, onHoverTarget);

        this.rightZipHandler = rightZipHandler;

        this.contentArea = document.getElementById('diff-editor-content')!;
        this.pathDisplay = document.getElementById('diff-current-path')!;
        this.saveLeftBtn = document.getElementById('btn-save-left') as HTMLButtonElement;
        this.saveRightBtn = document.getElementById('btn-save-right') as HTMLButtonElement;
        this.emptyState = document.getElementById('empty-state')!;
        this.editorContainer = document.getElementById('diff-editor-container')!

        this.saveLeftBtn.addEventListener('click', () => this.saveLeft());
        this.saveRightBtn.addEventListener('click', () => this.saveRight());
    }

    async loadFile(node: MergedZipNode) {
        this.currentNode = node;
        this.emptyState.classList.add('hidden');
        this.editorContainer.classList.remove('hidden');
        this.contentArea.innerHTML = '';

        this.pathDisplay.textContent = node.path;

        this.saveLeftBtn.disabled = true;
        this.saveRightBtn.disabled = true;

        if (this.mergeView) {
            this.mergeView.destroy();
            this.mergeView = null;
            this.leftEditor = null;
            this.rightEditor = null;
        }

        try {
            const isXmlFile = FILE_EXTENSIONS.XML.some(ext => node.name.endsWith(ext));

            // Load relationship files if XML
            if (isXmlFile) {
                if (node.leftExists) {
                    await this.loadRelsFile(node.path);
                }
                if (node.rightExists) {
                    await this.loadRelsFile(node.path, this.rightRelsMap, this.rightZipHandler);
                }
            }

            // Handle images
            if (FILE_EXTENSIONS.IMAGE.some(ext => node.name.toLowerCase().endsWith(ext))) {
                await this.showImageComparison(node);
                return;
            }

            // Load and format content
            const leftContent = await this.loadAndFormatContent(node, true, isXmlFile);
            const rightContent = await this.loadAndFormatContent(node, false, isXmlFile);

            this.contentArea.innerHTML = '';

            if (typeof leftContent === 'string' || typeof rightContent === 'string') {
                await this.createMergeView(leftContent, rightContent, node);
            } else {
                this.contentArea.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">Cannot compare binary files</div>';
            }

        } catch (error) {
            console.error(error);
            this.contentArea.innerHTML = '<div style="color: red; text-align: center; margin-top: 20px;">Error loading file</div>';
        }
    }

    private async loadAndFormatContent(node: MergedZipNode, isLeft: boolean, isXmlFile: boolean): Promise<string> {
        const exists = isLeft ? node.leftExists : node.rightExists;
        if (!exists) return '';

        const zipHandler = isLeft ? this.zipHandler : this.rightZipHandler;
        const data = await zipHandler.getFileContent(node.path);

        if (typeof data !== 'string') return '';

        // Format XML using inherited method
        if (isXmlFile) {
            return this.formatXml(data);
        }

        return data;
    }

    private async showImageComparison(node: MergedZipNode) {
        const container = createElement('div', {
            style: {
                display: 'flex',
                height: '100%',
                overflow: 'auto',
                gap: '10px',
                padding: '20px'
            }
        });

        const leftContainer = await this.createImageContainer(node, true);
        const rightContainer = await this.createImageContainer(node, false);

        container.appendChild(leftContainer);
        container.appendChild(rightContainer);
        this.contentArea.appendChild(container);
    }

    private async createImageContainer(node: MergedZipNode, isLeft: boolean): Promise<HTMLDivElement> {
        const container = createElement('div', {
            style: {
                flex: '1',
                textAlign: 'center'
            }
        });

        const exists = isLeft ? node.leftExists : node.rightExists;

        if (exists) {
            const zipHandler = isLeft ? this.zipHandler : this.rightZipHandler;
            const data = await zipHandler.getFileContent(node.path);

            if (data instanceof Blob) {
                const url = URL.createObjectURL(data);
                const img = createElement('img', {
                    style: {
                        maxWidth: '100%',
                        height: 'auto'
                    }
                });
                img.src = url;
                container.appendChild(img);
            }
        } else {
            container.innerHTML = '<div style="color: #9ca3af; margin-top: 20px;">File not found</div>';
        }

        return container;
    }

    private async createMergeView(leftContent: string, rightContent: string, node: MergedZipNode) {
        const baseExtensions = getCommonExtensions({ excludeSearch: true });

        const syncSearchAlignment = () => {
            if (!this.leftEditor || !this.rightEditor) return;

            const leftPanel = this.leftEditor.dom.querySelector('.cm-search');
            const rightPanel = this.rightEditor.dom.querySelector('.cm-search');

            this.leftEditor.dom.querySelector('.search-spacer')?.remove();
            this.rightEditor.dom.querySelector('.search-spacer')?.remove();

            if (leftPanel && !rightPanel) {
                const spacer = createElement('div', {
                    className: 'search-spacer',
                    style: { height: `${leftPanel.getBoundingClientRect().height}px`, width: '100%' }
                });
                this.rightEditor.dom.insertBefore(spacer, this.rightEditor.dom.firstChild);
            } else if (rightPanel && !leftPanel) {
                const spacer = createElement('div', {
                    className: 'search-spacer',
                    style: { height: `${rightPanel.getBoundingClientRect().height}px`, width: '100%' }
                });
                this.leftEditor.dom.insertBefore(spacer, this.leftEditor.dom.firstChild);
            }
        };

        const syncOpenSearch = () => {
            if (this.leftEditor && this.rightEditor) {
                openSearchPanel(this.leftEditor);
                openSearchPanel(this.rightEditor);
                setTimeout(syncSearchAlignment, 0);
            }
            return true;
        };

        const syncCloseSearch = () => {
            if (this.leftEditor && this.rightEditor) {
                closeSearchPanel(this.leftEditor);
                closeSearchPanel(this.rightEditor);
                setTimeout(syncSearchAlignment, 0);
            }
            return true;
        };

        const syncSearchKeymap = keymap.of([
            { key: "Mod-f", run: syncOpenSearch },
            { key: "Escape", run: syncCloseSearch }
        ]);

        // Create tooltips using inherited createRelationshipTooltipWithMap
        const leftTooltip = this.createRelationshipTooltipWithMap(this.relsMap);
        const rightTooltip = this.createRelationshipTooltipWithMap(this.rightRelsMap);

        this.mergeView = new MergeView({
            a: {
                doc: leftContent,
                extensions: [
                    ...baseExtensions,
                    search({ top: true }),
                    syncSearchKeymap,
                    leftTooltip,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged && node.leftExists) {
                            this.saveLeftBtn.disabled = false;
                        }
                        setTimeout(syncSearchAlignment, 0);
                    })
                ]
            },
            b: {
                doc: rightContent,
                extensions: [
                    ...baseExtensions,
                    search({ top: true }),
                    syncSearchKeymap,
                    rightTooltip,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged && node.rightExists) {
                            this.saveRightBtn.disabled = false;
                        }
                        setTimeout(syncSearchAlignment, 0);
                    })
                ]
            },
            parent: this.contentArea,
            highlightChanges: true,
            gutter: true
        });

        this.leftEditor = this.mergeView.a;
        this.rightEditor = this.mergeView.b;

        openSearchPanel(this.leftEditor);
        openSearchPanel(this.rightEditor);

        setTimeout(syncSearchAlignment, 100);
    }

    async saveLeft() {
        if (!this.currentNode || !this.currentNode.leftExists || !this.leftEditor) return;

        try {
            const content = this.leftEditor.state.doc.toString();
            await this.zipHandler.updateFile(this.currentNode.path, content);
            this.saveLeftBtn.disabled = true;
            alert('Left file saved internally!');
        } catch (error) {
            console.error(error);
            alert('Failed to save left file');
        }
    }

    async saveRight() {
        if (!this.currentNode || !this.currentNode.rightExists || !this.rightEditor) return;

        try {
            const content = this.rightEditor.state.doc.toString();
            await this.rightZipHandler.updateFile(this.currentNode.path, content);
            this.saveRightBtn.disabled = true;
            alert('Right file saved internally!');
        } catch (error) {
            console.error(error);
            alert('Failed to save right file');
        }
    }

    reset() {
        this.currentNode = null;
        if (this.mergeView) {
            this.mergeView.destroy();
            this.mergeView = null;
        }
        this.leftEditor = null;
        this.rightEditor = null;
        this.emptyState.classList.remove('hidden');
        this.editorContainer.classList.add('hidden');
    }

    cleanup() {
        this.reset();
    }
}
