import type { ZipNode } from './zipHandler';
import type { ZipHandler } from './zipHandler';
import type { MergedZipNode, DiffStatus } from '../types/diff';

/**
 * Merge two file trees into a single tree with diff status information
 */
export function mergeFileTrees(
    leftTree: ZipNode[],
    rightTree: ZipNode[]
): MergedZipNode[] {
    const nodeMap = new Map<string, MergedZipNode>();

    // Process left tree
    processTree(leftTree, nodeMap, true, false);

    // Process right tree
    processTree(rightTree, nodeMap, false, true);

    // Build merged tree structure
    const merged = buildTreeStructure(nodeMap);

    return merged;
}

function processTree(
    nodes: ZipNode[],
    nodeMap: Map<string, MergedZipNode>,
    isLeft: boolean,
    isRight: boolean
) {
    for (const node of nodes) {
        let mergedNode = nodeMap.get(node.path);

        if (!mergedNode) {
            // Create new merged node
            mergedNode = {
                name: node.name,
                path: node.path,
                isDir: node.isDir,
                status: 'both-same', // Will be computed later
                leftExists: isLeft,
                rightExists: isRight,
                children: node.isDir ? [] : undefined
            };
            nodeMap.set(node.path, mergedNode);
        } else {
            // Update existing node
            if (isLeft) mergedNode.leftExists = true;
            if (isRight) mergedNode.rightExists = true;
        }

        // Process children recursively
        if (node.children) {
            processTree(node.children, nodeMap, isLeft, isRight);
        }
    }
}

function buildTreeStructure(nodeMap: Map<string, MergedZipNode>): MergedZipNode[] {
    const rootNodes: MergedZipNode[] = [];
    const allNodes = Array.from(nodeMap.values());

    // Build parent-child relationships
    for (const node of allNodes) {
        const parentPath = getParentPath(node.path);

        if (!parentPath) {
            // Root level node
            rootNodes.push(node);
        } else {
            // Child node
            const parent = nodeMap.get(parentPath);
            if (parent && parent.children) {
                parent.children.push(node);
            } else {
                // Parent not found, treat as root
                rootNodes.push(node);
            }
        }
    }

    // Sort children in each node
    sortTreeNodes(rootNodes);

    return rootNodes;
}

function getParentPath(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) return null;
    return path.substring(0, lastSlash);
}

function sortTreeNodes(nodes: MergedZipNode[]) {
    nodes.sort((a, b) => {
        // Directories first
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        // Then alphabetically
        return a.name.localeCompare(b.name);
    });

    // Sort children recursively
    for (const node of nodes) {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children);
        }
    }
}

/**
 * Compare file contents from both ZIP handlers
 */
export async function compareFileContents(
    leftZip: ZipHandler,
    rightZip: ZipHandler,
    path: string
): Promise<boolean> {
    try {
        const leftContent = await leftZip.getFileContent(path);
        const rightContent = await rightZip.getFileContent(path);

        // For binary files (Blob), compare size only
        if (leftContent instanceof Blob && rightContent instanceof Blob) {
            return leftContent.size === rightContent.size;
        }

        // For text files, normalize and compare
        if (typeof leftContent === 'string' && typeof rightContent === 'string') {
            return normalizeXml(leftContent) === normalizeXml(rightContent);
        }

        return false;
    } catch (error) {
        console.error('Error comparing file contents:', error);
        return false;
    }
}

// 두 xml 문자열을 비교할 때 사용하는 정규화 함수
function normalizeXml(xml: string): string {
    return normalizeXmlAttributes(xml)
        // XML 선언 제거
        .replace(/<\?xml[^>]*\?>\s*/i, '')
        // Remove all whitespace between tags for comparison
        .replace(/>\s+</g, '><')
        .trim();
}

/**
 * Normalize XML by sorting attributes alphabetically
 * This helps with comparing files that have the same content but different attribute order
 */
export function normalizeXmlAttributes(xml: string): string {
    // Sort attributes within each tag
    return xml.replace(/<([a-zA-Z_:][\w:.-]*)\s+([^>]+?)(\/?)\s*>/g, (match, tagName, attrs, selfClose) => {
        // Extract all attributes: attr="value" or attr='value'
        const attrMatches = attrs.match(/[\w:.-]+\s*=\s*("[^"]*"|'[^']*')/g);

        if (!attrMatches || attrMatches.length <= 1) {
            // No attributes or single attribute - return as is
            return match;
        }

        // Sort attributes alphabetically (after normalizing whitespace)
        const sortedAttrs = attrMatches
            .map((attr: string) => attr.replace(/\s*=\s*/, '='))  // Normalize spaces around =
            .sort()
            .join(' ');

        return `<${tagName} ${sortedAttrs}${selfClose}>`;
    });
}

/**
 * Get SVG icon for diff status
 */
export function getDiffStatusIcon(status: DiffStatus): string {
    switch (status) {
        case 'both-diff':
            // Full bidirectional arrows (centered)
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill="currentColor"><path d="M230.4,384h256c14.14,0,25.6-11.46,25.6-25.6c0-14.14-11.46-25.6-25.6-25.6h-256c-14.14,0-25.6,11.46-25.6,25.6C204.8,372.54,216.26,384,230.4,384"/><path d="M212.3,376.5l102.4,102.4c10,10,26.21,10,36.2,0c10-10,10-26.21,0-36.2L248.5,340.3c-10-10-26.21-10-36.2,0C202.3,350.3,202.3,366.5,212.3,376.5"/><path d="M248.5,376.5l102.4-102.4c10-10,10-26.21,0-36.2c-10-10-26.21-10-36.2,0L212.3,340.3c-10,10-10,26.21,0,36.2C222.3,386.5,238.5,386.5,248.5,376.5"/><path d="M281.6,128h-256C11.46,128,0,139.46,0,153.6c0,14.14,11.46,25.6,25.6,25.6h256c14.14,0,25.6-11.46,25.6-25.6C307.2,139.46,295.74,128,281.6,128"/><path d="M263.5,135.5L161.1,237.9c-10,10-10,26.21,0,36.2c10,10,26.21,10,36.2,0l102.4-102.4c10-10,10-26.21,0-36.2C289.7,125.5,273.5,125.5,263.5,135.5"/><path d="M299.7,135.5L197.3,33.1c-10-10-26.21-10-36.2,0c-10,10-10,26.21,0,36.2l102.4,102.4c10,10,26.21,10,36.2,0C309.7,161.7,309.7,145.5,299.7,135.5"/></svg>`;
        case 'both-same':
            // Circle (O) as SVG - thicker stroke
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="60"><circle cx="256" cy="256" r="200"/></svg>`;
        case 'left-only':
            // Left arrow only - cropped and centered
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="190 220 320 200" fill="currentColor"><path d="M230.4,384h256c14.14,0,25.6-11.46,25.6-25.6c0-14.14-11.46-25.6-25.6-25.6h-256c-14.14,0-25.6,11.46-25.6,25.6C204.8,372.54,216.26,384,230.4,384"/><path d="M212.3,376.5l102.4,102.4c10,10,26.21,10,36.2,0c10-10,10-26.21,0-36.2L248.5,340.3c-10-10-26.21-10-36.2,0C202.3,350.3,202.3,366.5,212.3,376.5"/><path d="M248.5,376.5l102.4-102.4c10-10,10-26.21,0-36.2c-10-10-26.21-10-36.2,0L212.3,340.3c-10,10-10,26.21,0,36.2C222.3,386.5,238.5,386.5,248.5,376.5"/></svg>`;
        case 'right-only':
            // Right arrow only - cropped and centered
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 90 320 200" fill="currentColor"><path d="M281.6,128h-256C11.46,128,0,139.46,0,153.6c0,14.14,11.46,25.6,25.6,25.6h256c14.14,0,25.6-11.46,25.6-25.6C307.2,139.46,295.74,128,281.6,128"/><path d="M263.5,135.5L161.1,237.9c-10,10-10,26.21,0,36.2c10,10,26.21,10,36.2,0l102.4-102.4c10-10,10-26.21,0-36.2C289.7,125.5,273.5,125.5,263.5,135.5"/><path d="M299.7,135.5L197.3,33.1c-10-10-26.21-10-36.2,0c-10,10-10,26.21,0,36.2l102.4,102.4c10,10,26.21,10,36.2,0C309.7,161.7,309.7,145.5,299.7,135.5"/></svg>`;
    }
}

/**
 * Recursively compute diff statuses for all nodes
 */
export async function computeDiffStatuses(
    nodes: MergedZipNode[],
    leftZip: ZipHandler,
    rightZip: ZipHandler
): Promise<void> {
    for (const node of nodes) {
        await computeNodeStatus(node, leftZip, rightZip);

        // Process children recursively
        if (node.children && node.children.length > 0) {
            await computeDiffStatuses(node.children, leftZip, rightZip);
        }
    }
}

async function computeNodeStatus(
    node: MergedZipNode,
    leftZip: ZipHandler,
    rightZip: ZipHandler
): Promise<void> {
    // Determine basic status
    if (node.leftExists && node.rightExists) {
        // Both exist
        if (node.isDir) {
            // For directories, check if any child has diff
            node.status = await hasChildDiff(node, leftZip, rightZip);
        } else {
            // For files, compare contents
            const match = await compareFileContents(leftZip, rightZip, node.path);
            node.contentsMatch = match;
            node.status = match ? 'both-same' : 'both-diff';
        }
    } else if (node.leftExists && !node.rightExists) {
        node.status = 'left-only';
    } else if (!node.leftExists && node.rightExists) {
        node.status = 'right-only';
    } else {
        // Shouldn't happen
        node.status = 'both-same';
    }
}

async function hasChildDiff(
    node: MergedZipNode,
    leftZip: ZipHandler,
    rightZip: ZipHandler
): Promise<DiffStatus> {
    if (!node.children || node.children.length === 0) {
        return 'both-same';
    }

    // Check if any child has a diff
    for (const child of node.children) {
        await computeNodeStatus(child, leftZip, rightZip);

        if (child.status !== 'both-same') {
            return 'both-diff';
        }

        // Check grandchildren recursively
        if (child.isDir && child.children) {
            const childStatus = await hasChildDiff(child, leftZip, rightZip);
            if (childStatus === 'both-diff') {
                return 'both-diff';
            }
        }
    }

    return 'both-same';
}
