import { ZipHandler } from '../utils/zipHandler';
import { mergeFileTrees, computeDiffStatuses } from '../utils/diffUtils';
import { BaseMode } from './baseMode';
import { DiffEditor } from '../ui/diffEditor';
import { saveAs } from 'file-saver';
import type { MergedZipNode } from '../types/diff';

export class DiffMode extends BaseMode {
    private leftZipHandler: ZipHandler;
    private rightZipHandler: ZipHandler;
    private diffEditor: DiffEditor;
    private leftFileName: string = '';
    private rightFileName: string = '';

    private leftFileNameDisplay: HTMLElement;
    private rightFileNameDisplay: HTMLElement;
    private downloadLeftBtn: HTMLButtonElement;
    private downloadRightBtn: HTMLButtonElement;

    constructor() {
        super(true); // Diff mode

        this.leftZipHandler = new ZipHandler();
        this.rightZipHandler = new ZipHandler();
        this.leftFileNameDisplay = document.getElementById('left-file-name')!;
        this.rightFileNameDisplay = document.getElementById('right-file-name')!;
        this.downloadLeftBtn = document.getElementById('btn-download-left') as HTMLButtonElement;
        this.downloadRightBtn = document.getElementById('btn-download-right') as HTMLButtonElement;

        this.diffEditor = new DiffEditor(this.leftZipHandler, this.rightZipHandler, (path) => {
            this.treeView.highlightTreeNode(path);
        });

        this.downloadLeftBtn.addEventListener('click', () => this.downloadLeftFile());
        this.downloadRightBtn.addEventListener('click', () => this.downloadRightFile());
    }

    async initialize(leftFile: File, rightFile: File) {
        try {
            await this.leftZipHandler.loadAsync(leftFile);
            await this.rightZipHandler.loadAsync(rightFile);

            this.leftFileName = leftFile.name;
            this.rightFileName = rightFile.name;

            this.leftFileNameDisplay.textContent = leftFile.name;
            this.rightFileNameDisplay.textContent = rightFile.name;

            this.downloadLeftBtn.disabled = false;
            this.downloadRightBtn.disabled = false;

            await this.refreshDiffTree();
            this.diffEditor.reset();
        } catch (error) {
            console.error(error);
            alert('Failed to load files');
        }
    }

    async refreshDiffTree() {
        const leftTree = this.leftZipHandler.getFileTree();
        const rightTree = this.rightZipHandler.getFileTree();

        const mergedTree = mergeFileTrees(leftTree, rightTree);
        await computeDiffStatuses(mergedTree, this.leftZipHandler, this.rightZipHandler);

        this.treeView.render(
            mergedTree,
            async (node) => {
                await this.diffEditor.loadFile(node);
            },
            (node) => {
                this.handleDelete(node);
            }
        );
    }

    handleDelete(node: MergedZipNode) {
        const itemType = node.isDir ? '폴더' : '파일';
        let message = `"${node.name}" ${itemType}을(를) 삭제하시겠습니까?`;

        if (node.leftExists && node.rightExists) {
            message += '\n\n양쪽 파일 모두 삭제됩니다.';
        } else if (node.leftExists) {
            message += '\n\n왼쪽 파일에서만 삭제됩니다.';
        } else if (node.rightExists) {
            message += '\n\n오른쪽 파일에서만 삭제됩니다.';
        }

        if (node.isDir) {
            let leftCount = 0, rightCount = 0;
            if (node.leftExists) {
                leftCount = this.leftZipHandler.countFilesInFolder(node.path);
            }
            if (node.rightExists) {
                rightCount = this.rightZipHandler.countFilesInFolder(node.path);
            }

            if (node.leftExists && node.rightExists) {
                message = `"${node.name}" 폴더를 삭제하시겠습니까?\n(왼쪽: ${leftCount}개, 오른쪽: ${rightCount}개 파일 포함)\n\n양쪽 파일 모두 삭제됩니다.`;
            } else if (node.leftExists) {
                message = `"${node.name}" 폴더를 삭제하시겠습니까?\n(${leftCount}개 파일 포함)\n\n왼쪽 파일에서만 삭제됩니다.`;
            } else if (node.rightExists) {
                message = `"${node.name}" 폴더를 삭제하시겠습니까?\n(${rightCount}개 파일 포함)\n\n오른쪽 파일에서만 삭제됩니다.`;
            }
        }

        message = this.addCriticalFileWarning(message, node.path, node.name);

        if (confirm(message)) {
            this.animateNodeDeletion(node.path);

            this.waitForAnimation().then(async () => {
                try {
                    if (node.leftExists) {
                        if (node.isDir) {
                            this.leftZipHandler.deleteFolder(node.path);
                        } else {
                            this.leftZipHandler.deleteFile(node.path);
                        }
                    }

                    if (node.rightExists) {
                        if (node.isDir) {
                            this.rightZipHandler.deleteFolder(node.path);
                        } else {
                            this.rightZipHandler.deleteFile(node.path);
                        }
                    }

                    await this.refreshDiffTree();
                    this.diffEditor.reset();
                } catch (error) {
                    console.error(error);
                    alert('삭제 중 오류 발생');
                }
            });
        }
    }

    async downloadLeftFile() {
        if (!this.leftFileName) return;
        try {
            const blob = await this.leftZipHandler.generateZip('blob');
            saveAs(blob, this.leftFileName);
        } catch (error) {
            console.error(error);
            alert('Failed to generate left zip');
        }
    }

    async downloadRightFile() {
        if (!this.rightFileName) return;
        try {
            const blob = await this.rightZipHandler.generateZip('blob');
            saveAs(blob, this.rightFileName);
        } catch (error) {
            console.error(error);
            alert('Failed to generate right zip');
        }
    }

    cleanup() {
        this.diffEditor.cleanup();
        this.leftFileName = '';
        this.rightFileName = '';
        this.leftFileNameDisplay.textContent = '';
        this.rightFileNameDisplay.textContent = '';
        this.downloadLeftBtn.disabled = true;
        this.downloadRightBtn.disabled = true;
        this.clearSidebarTree();
    }
}
