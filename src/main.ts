import { ZipHandler, type ZipNode } from './utils/zipHandler';
import { renderFileTree, highlightTreeNode } from './ui/treeView';
import { Editor } from './ui/editor';
import { saveAs } from 'file-saver';

const zipHandler = new ZipHandler();
const editor = new Editor(zipHandler, (path) => {
    highlightTreeNode(sidebarTree, path);
});

// Elements
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropZone = document.getElementById('drop-zone')!;
const sidebarTree = document.getElementById('file-tree')!;
const sidebar = document.getElementById('sidebar')!;
const resizer = document.getElementById('resizer')!;
const fileNameDisplay = document.getElementById('file-name')!;
const downloadBtn = document.getElementById('btn-download') as HTMLButtonElement;

let currentFileName = '';

const criticalFiles = [
    '[Content_Types].xml',
    'document.xml',
    'workbook.xml',
    'presentation.xml',
    'content.xml',
    'styles.xml',
    'settings.xml',
    'app.xml',
    'core.xml'
];

// File Handling
async function handleFile(file: File) {
    try {
        await zipHandler.loadAsync(file);
        currentFileName = file.name;
        fileNameDisplay.textContent = `(${file.name})`;
        downloadBtn.disabled = false;

        refreshFileTree();
        editor.reset();
        dropZone.classList.add('hidden');
    } catch (error) {
        console.error(error);
        alert('Failed to load file');
    }
}

function refreshFileTree() {
    // Save currently open folders
    const openFolders = new Set<string>();
    sidebarTree.querySelectorAll('.tree-children.open').forEach(ul => {
        const li = ul.parentElement;
        if (li) {
            const content = li.querySelector('.tree-content');
            if (content) {
                const path = content.getAttribute('data-path');
                if (path) openFolders.add(path);
            }
        }
    });

    const tree = zipHandler.getFileTree();
    renderFileTree(
        sidebarTree,
        tree,
        async (node) => {
            await editor.loadFile(node);
        },
        (node) => {
            handleDelete(node);
        }
    );

    // Restore open folders
    openFolders.forEach(path => {
        const safePath = path.replace(/"/g, '\\"');
        const content = sidebarTree.querySelector(`.tree-content[data-path="${safePath}"]`);
        if (content) {
            const li = content.parentElement;
            if (li) {
                const childrenContainer = li.querySelector('.tree-children');
                const toggle = content.querySelector('.tree-toggle') as HTMLElement;
                const icon = content.querySelector('.tree-icon') as HTMLElement;

                if (childrenContainer) {
                    childrenContainer.classList.add('open');
                    if (toggle) toggle.style.transform = 'rotate(90deg)';
                    if (icon) icon.textContent = '📂';
                }
            }
        }
    });
}

function handleDelete(node: ZipNode) {
    const itemType = node.isDir ? '폴더' : '파일';
    let message = `"${node.name}" ${itemType}을(를) 삭제하시겠습니까?`;

    // Add file count for folders
    if (node.isDir) {
        const fileCount = zipHandler.countFilesInFolder(node.path);
        message = `"${node.name}" 폴더를 삭제하시겠습니까?\n(${fileCount}개 파일 포함)`;
    }

    // Check if it's a critical file
    const isCritical = criticalFiles.some(critical =>
        node.path.endsWith(critical) || node.name === critical
    );

    if (isCritical) {
        message += '\n\n⚠️ 경고: 이 파일은 문서의 핵심 파일입니다.\n삭제하면 문서가 손상될 수 있습니다.';
    }

    if (confirm(message)) {
        // Find and animate the tree node before deletion
        const safePath = node.path.replace(/"/g, '\\"');
        const treeContent = sidebarTree.querySelector(`.tree-content[data-path="${safePath}"]`);

        if (treeContent) {
            const treeNode = treeContent.parentElement; // li element
            treeContent.classList.add('deleting');

            // If it's a folder with children, animate children too
            if (treeNode) {
                const childrenContainer = treeNode.querySelector('.tree-children');
                if (childrenContainer) {
                    childrenContainer.classList.add('deleting');
                }
            }
        }

        // Wait for animation to complete, then delete
        setTimeout(() => {
            if (node.isDir) {
                zipHandler.deleteFolder(node.path);
            } else {
                zipHandler.deleteFile(node.path);
            }

            // Check if currently open file is deleted
            const currentPath = editor.getCurrentFilePath();
            if (currentPath && (currentPath === node.path || currentPath.startsWith(node.path + '/'))) {
                editor.reset();
            }

            // Refresh tree
            refreshFileTree();
        }, 300); // Match CSS transition duration
    }
}

// Event Listeners
fileInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
});

downloadBtn.addEventListener('click', async () => {
    if (!currentFileName) return;
    try {
        const blob = await zipHandler.generateZip('blob');
        saveAs(blob, currentFileName);
    } catch (error) {
        console.error(error);
        alert('Failed to generate zip');
    }
});

// Drag & Drop
window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.remove('hidden');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Resizer Logic
let isResizing = false;

resizer.addEventListener('mousedown', () => {
    isResizing = true;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    // Calculate new width
    const newWidth = e.clientX;

    // Min/Max constraints
    if (newWidth > 150 && newWidth < 600) {
        sidebar.style.width = `${newWidth}px`;
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// Touch Events for Mobile Resizing
resizer.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling while resizing
    isResizing = true;
    resizer.classList.add('resizing');
    document.body.style.userSelect = 'none';
});

document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;

    // Get touch position
    const touch = e.touches[0];
    const newWidth = touch.clientX;

    // Min/Max constraints
    if (newWidth > 150 && newWidth < 600) {
        sidebar.style.width = `${newWidth}px`;
    }
});

document.addEventListener('touchend', () => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.userSelect = '';
    }
});
