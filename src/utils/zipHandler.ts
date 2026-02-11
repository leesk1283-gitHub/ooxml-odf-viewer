import JSZip from 'jszip';

export interface ZipNode {
    name: string;
    path: string;
    isDir: boolean;
    children?: ZipNode[];
    content?: string | Blob; // For caching content if needed, though usually we load on demand
}

export class ZipHandler {
    private zip: JSZip;

    constructor() {
        this.zip = new JSZip();
    }

    async loadAsync(file: File): Promise<void> {
        this.zip = await JSZip.loadAsync(file);
    }

    getFileTree(): ZipNode[] {
        const root: ZipNode[] = [];
        // const paths: { [key: string]: ZipNode } = {};

        this.zip.forEach((relativePath, zipEntry) => {
            const parts = relativePath.split('/');
            // Remove empty parts (e.g. from trailing slashes)
            const cleanParts = parts.filter(p => p.length > 0);

            let currentPath = '';
            let currentLevel = root;

            cleanParts.forEach((part, index) => {
                const isLast = index === cleanParts.length - 1;
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                // If it's a directory entry from zip (ends with /), handle it
                const isDir = zipEntry.dir || (isLast && relativePath.endsWith('/'));

                // Check if we already have this node
                let node = currentLevel.find(n => n.name === part);

                if (!node) {
                    node = {
                        name: part,
                        path: currentPath,
                        isDir: isDir || !isLast, // Intermediate parts are dirs
                        children: (isDir || !isLast) ? [] : undefined
                    };
                    currentLevel.push(node);
                }

                if (node.children) {
                    currentLevel = node.children;
                }
            });
        });

        return root;
    }

    async getFileContent(path: string): Promise<string | Blob> {
        const file = this.zip.file(path);
        if (!file) {
            throw new Error(`File not found: ${path}`);
        }

        // Check extension to decide return type
        const lowerPath = path.toLowerCase();
        if (lowerPath.endsWith('.xml') || lowerPath.endsWith('.rels') || lowerPath.endsWith('.txt') || lowerPath.endsWith('.vml')) {
            return await file.async('string');
        } else {
            return await file.async('blob');
        }
    }

    async updateFile(path: string, content: string): Promise<void> {
        this.zip.file(path, content);
    }

    async generateZip(type: 'blob' = 'blob'): Promise<Blob> {
        return await this.zip.generateAsync({ type });
    }

    deleteFile(path: string): void {
        this.zip.remove(path);
    }

    deleteFolder(path: string): void {
        // Remove folder and all its contents
        const normalizedPath = path.endsWith('/') ? path : path + '/';

        // Collect all files to delete
        const filesToDelete: string[] = [];
        this.zip.forEach((relativePath) => {
            if (relativePath.startsWith(normalizedPath) || relativePath === path) {
                filesToDelete.push(relativePath);
            }
        });

        // Delete all collected files
        filesToDelete.forEach(file => this.zip.remove(file));
    }

    countFilesInFolder(path: string): number {
        const normalizedPath = path.endsWith('/') ? path : path + '/';
        let count = 0;

        this.zip.forEach((relativePath, zipEntry) => {
            // Only count files (not directories) within this folder
            if (relativePath.startsWith(normalizedPath) && !zipEntry.dir) {
                count++;
            }
        });

        return count;
    }
}
