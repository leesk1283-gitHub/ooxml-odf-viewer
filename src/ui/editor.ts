import { ZipHandler, type ZipNode } from '../utils/zipHandler';
import { BaseEditor } from './baseEditor';
import * as monaco from 'monaco-editor';
import { getCommonEditorOptions } from '../lib/monaco';
import { FILE_EXTENSIONS } from '../const/constants';

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
    private editor: monaco.editor.IStandaloneCodeEditor | null = null;
    private hoverProvider: monaco.IDisposable | null = null;
    private changeListener: monaco.IDisposable | null = null;

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

        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
        if (this.hoverProvider) {
            this.hoverProvider.dispose();
            this.hoverProvider = null;
        }
        if (this.changeListener) {
            this.changeListener.dispose();
            this.changeListener = null;
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

        // Create Monaco editor
        this.editor = monaco.editor.create(this.contentArea, {
            value: displayContent,
            ...getCommonEditorOptions()
        });

        // Register rId hover tooltip
        this.hoverProvider = this.createHoverProvider(this.editor, this.relsMap);

        // Enable save button on edit
        this.changeListener = this.editor.onDidChangeModelContent(() => {
            this.saveBtn.disabled = false;
        });

        // Ctrl/Cmd+S to save
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            this.save();
        });
    }

    private loadImageFile(data: Blob) {
        const url = URL.createObjectURL(data);
        const img = document.createElement('img');
        img.src = url;
        img.className = 'preview-image';
        this.contentArea.appendChild(img);
    }

    async save() {
        if (!this.currentNode || !this.editor) return;

        const contentToSave = this.editor.getValue();

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
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
        if (this.hoverProvider) {
            this.hoverProvider.dispose();
            this.hoverProvider = null;
        }
        if (this.changeListener) {
            this.changeListener.dispose();
            this.changeListener = null;
        }
        this.emptyState.classList.remove('hidden');
        this.editorContainer.classList.add('hidden');
    }

    getCurrentFilePath(): string | null {
        return this.currentNode ? this.currentNode.path : null;
    }
}
