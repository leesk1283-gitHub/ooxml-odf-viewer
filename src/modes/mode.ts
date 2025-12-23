import { ZipHandler, type ZipNode } from '../utils/zipHandler';
import { BaseMode } from './baseMode';
import { Editor } from '../ui/editor';
import { saveAs } from 'file-saver';

export class Mode extends BaseMode {
    private zipHandler: ZipHandler;
    private editor: Editor;
    private currentFileName: string = '';

    private fileNameDisplay: HTMLElement;
    private downloadBtn: HTMLButtonElement;

    constructor() {
        super(false); // Not diff mode

        this.zipHandler = new ZipHandler();
        this.fileNameDisplay = document.getElementById('file-name')!;
        this.downloadBtn = document.getElementById('btn-download') as HTMLButtonElement;

        this.editor = new Editor(this.zipHandler, (path) => {
            this.treeView.highlightTreeNode(path);
        });

        this.downloadBtn.addEventListener('click', () => this.downloadFile());
    }

    async handleFile(file: File) {
        try {
            await this.zipHandler.loadAsync(file);
            this.currentFileName = file.name;
            this.fileNameDisplay.textContent = `(${file.name})`;
            this.downloadBtn.disabled = false;

            this.refreshFileTree();
            this.editor.reset();
        } catch (error) {
            console.error(error);
            alert('Failed to load file');
        }
    }

    refreshFileTree() {
        const openFolders = this.saveOpenFolders();

        const tree = this.zipHandler.getFileTree();
        this.treeView.render(
            tree,
            async (node) => {
                await this.editor.loadFile(node);
            },
            (node) => {
                this.handleDelete(node);
            }
        );

        this.restoreOpenFolders(openFolders);
    }

    handleDelete(node: ZipNode) {
        const itemType = node.isDir ? '폴더' : '파일';
        let message = `"${node.name}" ${itemType}을(를) 삭제하시겠습니까?`;

        if (node.isDir) {
            const fileCount = this.zipHandler.countFilesInFolder(node.path);
            message = `"${node.name}" 폴더를 삭제하시겠습니까?\n(${fileCount}개 파일 포함)`;
        }

        message = this.addCriticalFileWarning(message, node.path, node.name);

        if (confirm(message)) {
            this.animateNodeDeletion(node.path);

            this.waitForAnimation().then(() => {
                if (node.isDir) {
                    this.zipHandler.deleteFolder(node.path);
                } else {
                    this.zipHandler.deleteFile(node.path);
                }

                const currentPath = this.editor.getCurrentFilePath();
                if (currentPath && (currentPath === node.path || currentPath.startsWith(node.path + '/'))) {
                    this.editor.reset();
                }

                this.refreshFileTree();
            });
        }
    }

    async downloadFile() {
        if (!this.currentFileName) return;
        try {
            const blob = await this.zipHandler.generateZip('blob');
            saveAs(blob, this.currentFileName);
        } catch (error) {
            console.error(error);
            alert('Failed to generate zip');
        }
    }

    cleanup() {
        this.editor.reset();
        this.currentFileName = '';
        this.fileNameDisplay.textContent = '';
        this.downloadBtn.disabled = true;
        this.clearSidebarTree();
    }
}
