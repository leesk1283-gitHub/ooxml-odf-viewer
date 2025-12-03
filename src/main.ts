import { ZipHandler } from './utils/zipHandler';
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

// File Handling
async function handleFile(file: File) {
    try {
        await zipHandler.loadAsync(file);
        const tree = zipHandler.getFileTree();

        currentFileName = file.name;
        fileNameDisplay.textContent = `(${file.name})`;
        downloadBtn.disabled = false;

        renderFileTree(sidebarTree, tree, (node) => {
            editor.loadFile(node);
        });

        editor.reset();
        dropZone.classList.add('hidden');
    } catch (error) {
        console.error(error);
        alert('Failed to load file');
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
