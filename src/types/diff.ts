export type AppMode = 'single' | 'diff';

export interface MergedZipNode {
    name: string;
    path: string;
    isDir: boolean;
    status: DiffStatus;
    children?: MergedZipNode[];
    leftExists: boolean;
    rightExists: boolean;
    contentsMatch?: boolean; // only for files
}

export type DiffStatus = 'both-same' | 'both-diff' | 'left-only' | 'right-only';
