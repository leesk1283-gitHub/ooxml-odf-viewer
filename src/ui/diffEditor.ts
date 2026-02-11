import { ZipHandler } from '../utils/zipHandler';
import type { MergedZipNode } from '../types/diff';
import { BaseEditor } from './baseEditor';
import * as monaco from 'monaco-editor';
import { getDiffEditorOptions } from '../lib/monaco';
import { FILE_EXTENSIONS } from '../const/constants';
import { createElement } from '../utils/domUtils';

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
    private prevDiffBtn: HTMLButtonElement;
    private nextDiffBtn: HTMLButtonElement;
    private diffCounter: HTMLElement;

    private currentNode: MergedZipNode | null = null;
    private rightZipHandler: ZipHandler;
    private diffEditor: monaco.editor.IStandaloneDiffEditor | null = null;
    private originalModel: monaco.editor.ITextModel | null = null;
    private modifiedModel: monaco.editor.ITextModel | null = null;
    private leftHoverProvider: monaco.IDisposable | null = null;
    private rightHoverProvider: monaco.IDisposable | null = null;
    private leftChangeListener: monaco.IDisposable | null = null;
    private rightChangeListener: monaco.IDisposable | null = null;
    private rightRelsMap: Map<string, string> = new Map();

    // Diff navigation
    private lineChanges: monaco.editor.ILineChange[] = [];
    private currentDiffIndex: number = -1;

    constructor(leftZipHandler: ZipHandler, rightZipHandler: ZipHandler, onHoverTarget: (path: string | null) => void) {
        super(leftZipHandler, onHoverTarget);

        this.rightZipHandler = rightZipHandler;

        this.contentArea = document.getElementById('diff-editor-content')!;
        this.pathDisplay = document.getElementById('diff-current-path')!;
        this.saveLeftBtn = document.getElementById('btn-save-left') as HTMLButtonElement;
        this.saveRightBtn = document.getElementById('btn-save-right') as HTMLButtonElement;
        this.prevDiffBtn = document.getElementById('btn-prev-diff') as HTMLButtonElement;
        this.nextDiffBtn = document.getElementById('btn-next-diff') as HTMLButtonElement;
        this.diffCounter = document.getElementById('diff-counter')!;
        this.emptyState = document.getElementById('empty-state')!;
        this.editorContainer = document.getElementById('diff-editor-container')!

        this.saveLeftBtn.addEventListener('click', () => this.saveLeft());
        this.saveRightBtn.addEventListener('click', () => this.saveRight());
        this.prevDiffBtn.addEventListener('click', () => this.goToPreviousDiff());
        this.nextDiffBtn.addEventListener('click', () => this.goToNextDiff());
    }

    async loadFile(node: MergedZipNode) {
        this.currentNode = node;
        this.emptyState.classList.add('hidden');
        this.editorContainer.classList.remove('hidden');
        this.contentArea.innerHTML = '';

        this.pathDisplay.textContent = node.path;

        this.saveLeftBtn.disabled = true;
        this.saveRightBtn.disabled = true;

        if (this.diffEditor) {
            this.diffEditor.dispose();
            this.diffEditor = null;
        }
        if (this.originalModel) {
            this.originalModel.dispose();
            this.originalModel = null;
        }
        if (this.modifiedModel) {
            this.modifiedModel.dispose();
            this.modifiedModel = null;
        }
        if (this.leftHoverProvider) {
            this.leftHoverProvider.dispose();
            this.leftHoverProvider = null;
        }
        if (this.rightHoverProvider) {
            this.rightHoverProvider.dispose();
            this.rightHoverProvider = null;
        }
        if (this.leftChangeListener) {
            this.leftChangeListener.dispose();
            this.leftChangeListener = null;
        }
        if (this.rightChangeListener) {
            this.rightChangeListener.dispose();
            this.rightChangeListener = null;
        }

        // Reset diff navigation
        this.lineChanges = [];
        this.currentDiffIndex = -1;
        this.diffCounter.textContent = '-/-';
        this.prevDiffBtn.disabled = true;
        this.nextDiffBtn.disabled = true;

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
                await this.createDiffView(leftContent, rightContent, node);
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

    private async createDiffView(leftContent: string, rightContent: string, node: MergedZipNode) {
        // Create diff editor
        this.diffEditor = monaco.editor.createDiffEditor(this.contentArea, {
            ...getDiffEditorOptions()
        });

        // Create models and store references for proper disposal
        this.originalModel = monaco.editor.createModel(leftContent, 'xml');
        this.modifiedModel = monaco.editor.createModel(rightContent, 'xml');
        this.diffEditor.setModel({ original: this.originalModel, modified: this.modifiedModel });

        // Get individual editors
        const leftEditor = this.diffEditor.getOriginalEditor();
        const rightEditor = this.diffEditor.getModifiedEditor();

        // Register hover providers for rId tooltips
        this.leftHoverProvider = this.createHoverProvider(leftEditor, this.relsMap);
        this.rightHoverProvider = this.createHoverProvider(rightEditor, this.rightRelsMap);

        // Listen for changes
        if (node.leftExists) {
            this.leftChangeListener = leftEditor.onDidChangeModelContent(() => {
                this.saveLeftBtn.disabled = false;
            });
        }
        if (node.rightExists) {
            this.rightChangeListener = rightEditor.onDidChangeModelContent(() => {
                this.saveRightBtn.disabled = false;
            });
        }

        // Add keyboard shortcuts - save based on which editor has focus
        leftEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (leftEditor.hasTextFocus()) {
                this.saveLeft();
            }
        });
        rightEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (rightEditor.hasTextFocus()) {
                this.saveRight();
            }
        });

        // Add diff navigation shortcuts (F7/F8)
        leftEditor.addCommand(monaco.KeyCode.F7, () => {
            this.goToPreviousDiff();
        });
        leftEditor.addCommand(monaco.KeyCode.F8, () => {
            this.goToNextDiff();
        });
        rightEditor.addCommand(monaco.KeyCode.F7, () => {
            this.goToPreviousDiff();
        });
        rightEditor.addCommand(monaco.KeyCode.F8, () => {
            this.goToNextDiff();
        });

        // Initialize diff navigation
        this.initializeDiffNavigation();
    }

    private initializeDiffNavigation() {
        if (!this.diffEditor) return;

        // Monaco diff editor computes changes asynchronously
        // We need to wait for the computation to complete
        const updateChanges = (navigateToFirst: boolean = false) => {
            const changes = this.diffEditor?.getLineChanges();
            console.log('[DiffEditor] Line changes detected:', changes?.length || 0);

            if (changes && changes.length > 0) {
                this.lineChanges = changes;
                this.currentDiffIndex = 0;
                this.updateDiffNavigationUI();

                // Only navigate to first diff on initial load, not on user edits
                if (navigateToFirst) {
                    this.goToDiff(0);
                }
            } else {
                // No changes detected
                this.lineChanges = [];
                this.currentDiffIndex = -1;
                this.updateDiffNavigationUI();
                console.log('[DiffEditor] No differences found or still computing...');
            }
        };

        // Initial load - navigate to first diff
        updateChanges(true);

        // Also try after a short delay to ensure diff computation is complete
        setTimeout(() => {
            updateChanges(true);
        }, 100);
    }

    private updateDiffNavigationUI() {
        const hasChanges = this.lineChanges.length > 0;
        const currentNum = this.currentDiffIndex >= 0 ? this.currentDiffIndex + 1 : 0;
        const totalNum = this.lineChanges.length;

        // Update counter (IntelliJ style: "3 of 15 differences")
        if (hasChanges) {
            this.diffCounter.textContent = `${currentNum} of ${totalNum}`;
        } else {
            this.diffCounter.textContent = 'No differences';
        }

        console.log('[DiffEditor] Navigation state:', { currentNum, totalNum, hasChanges });

        // Enable/disable buttons
        this.prevDiffBtn.disabled = !hasChanges || this.currentDiffIndex <= 0;
        this.nextDiffBtn.disabled = !hasChanges || this.currentDiffIndex >= this.lineChanges.length - 1;
    }

    private goToPreviousDiff() {
        if (this.currentDiffIndex > 0) {
            this.currentDiffIndex--;
            this.goToDiff(this.currentDiffIndex);
            this.updateDiffNavigationUI();
        }
    }

    private goToNextDiff() {
        if (this.currentDiffIndex < this.lineChanges.length - 1) {
            this.currentDiffIndex++;
            this.goToDiff(this.currentDiffIndex);
            this.updateDiffNavigationUI();
        }
    }

    private goToDiff(index: number) {
        if (!this.diffEditor || index < 0 || index >= this.lineChanges.length) {
            console.log('[DiffEditor] Cannot navigate to diff:', { index, total: this.lineChanges.length });
            return;
        }

        const change = this.lineChanges[index];
        const modifiedEditor = this.diffEditor.getModifiedEditor();
        const originalEditor = this.diffEditor.getOriginalEditor();

        console.log('[DiffEditor] Navigating to diff:', {
            index: index + 1,
            originalLine: change.originalStartLineNumber,
            modifiedLine: change.modifiedStartLineNumber
        });

        // Calculate target line (prefer modified side, fallback to original)
        const targetLine = change.modifiedStartLineNumber || change.originalStartLineNumber;

        if (targetLine) {
            // Reveal and focus the line in modified editor
            modifiedEditor.revealLineInCenter(targetLine);
            modifiedEditor.setPosition({ lineNumber: targetLine, column: 1 });
            modifiedEditor.focus();

            // Also reveal in original editor if it has a corresponding line
            if (change.originalStartLineNumber) {
                originalEditor.revealLineInCenter(change.originalStartLineNumber);
            }
        }
    }

    async saveLeft() {
        if (!this.currentNode || !this.currentNode.leftExists || !this.diffEditor) return;

        try {
            const content = this.diffEditor.getOriginalEditor().getValue();
            await this.zipHandler.updateFile(this.currentNode.path, content);
            this.saveLeftBtn.disabled = true;
            alert('Left file saved internally!');
        } catch (error) {
            console.error(error);
            alert('Failed to save left file');
        }
    }

    async saveRight() {
        if (!this.currentNode || !this.currentNode.rightExists || !this.diffEditor) return;

        try {
            const content = this.diffEditor.getModifiedEditor().getValue();
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
        if (this.diffEditor) {
            this.diffEditor.dispose();
            this.diffEditor = null;
        }
        if (this.originalModel) {
            this.originalModel.dispose();
            this.originalModel = null;
        }
        if (this.modifiedModel) {
            this.modifiedModel.dispose();
            this.modifiedModel = null;
        }
        if (this.leftHoverProvider) {
            this.leftHoverProvider.dispose();
            this.leftHoverProvider = null;
        }
        if (this.rightHoverProvider) {
            this.rightHoverProvider.dispose();
            this.rightHoverProvider = null;
        }
        if (this.leftChangeListener) {
            this.leftChangeListener.dispose();
            this.leftChangeListener = null;
        }
        if (this.rightChangeListener) {
            this.rightChangeListener.dispose();
            this.rightChangeListener = null;
        }

        // Reset diff navigation
        this.lineChanges = [];
        this.currentDiffIndex = -1;
        this.diffCounter.textContent = '-/-';
        this.prevDiffBtn.disabled = true;
        this.nextDiffBtn.disabled = true;

        this.emptyState.classList.remove('hidden');
        this.editorContainer.classList.add('hidden');
    }

    cleanup() {
        this.reset();
    }
}
