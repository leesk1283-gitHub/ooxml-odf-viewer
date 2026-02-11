import { Mode } from './modes/mode';
import { DiffMode } from './modes/diffMode';
import { initializeMonaco } from './lib/monaco';

// Initialize Monaco Editor
initializeMonaco();

// Mode State
let mode: Mode | null = null;
let diffMode: DiffMode | null = null;

// Elements
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const dropZone = document.getElementById('drop-zone')!;
const sidebar = document.getElementById('sidebar')!;
const resizer = document.getElementById('resizer')!;

// File Handling
async function enterSingleMode(file: File) {
    cleanupCurrentMode();
    showSingleModeUI();
    mode = new Mode();
    await mode.handleFile(file);
    dropZone.classList.add('hidden');
}

async function enterDiffMode(leftFile: File, rightFile: File) {
    cleanupCurrentMode();
    showDiffModeUI();
    diffMode = new DiffMode();
    await diffMode.initialize(leftFile, rightFile);
    dropZone.classList.add('hidden');
}

function cleanupCurrentMode() {
    if (mode) {
        mode.cleanup();
        mode = null;
    }
    if (diffMode) {
        diffMode.cleanup();
        diffMode = null;
    }
}

function showSingleModeUI() {
    // Show single mode elements
    document.getElementById('file-name')?.classList.remove('hidden');
    document.getElementById('btn-download')?.classList.remove('hidden');
    document.getElementById('editor-container')?.classList.remove('hidden');

    // Hide diff mode elements
    document.getElementById('diff-file-names')?.classList.add('hidden');
    document.getElementById('diff-download-btns')?.classList.add('hidden');
    document.getElementById('diff-editor-container')?.classList.add('hidden');
}

function showDiffModeUI() {
    // Hide single mode elements
    document.getElementById('file-name')?.classList.add('hidden');
    document.getElementById('btn-download')?.classList.add('hidden');
    document.getElementById('editor-container')?.classList.add('hidden');

    // Show diff mode elements
    document.getElementById('diff-file-names')?.classList.remove('hidden');
    document.getElementById('diff-download-btns')?.classList.remove('hidden');
    document.getElementById('diff-editor-container')?.classList.remove('hidden');
}

// Event Listeners
fileInput.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    if (files.length === 2) {
        await enterDiffMode(files[0], files[1]);
    } else if (files.length === 1) {
        await enterSingleMode(files[0]);
    } else {
        alert('Please select 1 file for single mode or 2 files for diff mode');
    }

    // Reset input
    fileInput.value = '';
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

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (files.length === 2) {
        await enterDiffMode(files[0], files[1]);
    } else if (files.length === 1) {
        await enterSingleMode(files[0]);
    } else {
        alert('Please drop 1 file for single mode or 2 files for diff mode');
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
