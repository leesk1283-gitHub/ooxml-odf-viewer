import type { ZipNode } from '../utils/zipHandler';
import type { MergedZipNode } from '../types/diff';
import { getDiffStatusIcon } from '../utils/diffUtils';

/**
 * TreeView class for rendering file tree
 * Supports both single mode and diff mode
 */
export class TreeView {
    protected container: HTMLElement;
    private isDiffMode: boolean;
    private nodeByContent = new WeakMap<HTMLElement, ZipNode | MergedZipNode>();
    private onSelect: ((node: ZipNode | MergedZipNode) => void) | null = null;

    constructor(container: HTMLElement, isDiffMode: boolean = false) {
        this.container = container;
        this.isDiffMode = isDiffMode;
        this.container.tabIndex = 0;
        this.container.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Render the file tree
     */
    render<T extends ZipNode | MergedZipNode>(
        nodes: T[],
        onSelect: (node: T) => void,
        onDelete: (node: T) => void,
        selectedPath?: string
    ) {
        this.container.innerHTML = '';
        this.nodeByContent = new WeakMap<HTMLElement, ZipNode | MergedZipNode>();
        this.onSelect = onSelect as (node: ZipNode | MergedZipNode) => void;

        const ul = document.createElement('ul');
        ul.style.paddingLeft = '0';

        // Sort nodes: folders first, then files, each sorted by name
        const sortedNodes = this.sortNodes(nodes);

        sortedNodes.forEach(node => {
            ul.appendChild(this.createTreeNode(node, onSelect, onDelete, selectedPath, 0));
        });

        this.container.appendChild(ul);
    }

    /**
     * Sort nodes: folders first, then files, each alphabetically by name
     */
    private sortNodes<T extends ZipNode | MergedZipNode>(nodes: T[]): T[] {
        return [...nodes].sort((a, b) => {
            // Folders come first
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;

            // Within same type, sort alphabetically (case-insensitive)
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
    }

    /**
     * Highlight a specific node in the tree by path
     */
    highlightTreeNode(path: string | null) {
        const highlighted = this.container.querySelectorAll('.tree-content.hover-highlight');
        highlighted.forEach(el => el.classList.remove('hover-highlight'));

        if (path) {
            const safePath = CSS.escape(path);
            let target = this.container.querySelector(`.tree-content[data-path="${safePath}"]`);

            if (!target) {
                const altPath = path.startsWith('/') ? path.substring(1) : `/${path}`;
                const safeAltPath = CSS.escape(altPath);
                target = this.container.querySelector(`.tree-content[data-path="${safeAltPath}"]`);
            }

            if (target) {
                target.classList.add('hover-highlight');

                let parent = target.parentElement;
                while (parent) {
                    if (parent.tagName === 'UL' && parent.classList.contains('tree-children')) {
                        parent.classList.add('open');
                        const parentLi = parent.parentElement;
                        if (parentLi) {
                            const toggle = parentLi.querySelector('.tree-toggle') as HTMLElement;
                            const icon = parentLi.querySelector('.tree-icon') as HTMLElement;
                            if (toggle) toggle.style.transform = 'rotate(90deg)';
                            if (icon) icon.textContent = '📂';
                        }
                    }
                    parent = parent.parentElement;
                    if (parent === this.container) break;
                }

                target.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    /**
     * Create a tree node element
     */
    protected createTreeNode<T extends ZipNode | MergedZipNode>(
        node: T,
        onSelect: (node: T) => void,
        onDelete: (node: T) => void,
        selectedPath: string | undefined,
        level: number
    ): HTMLElement {
        const li = document.createElement('li');

        const content = document.createElement('div');
        content.className = 'tree-content';
        content.setAttribute('data-path', node.path);
        this.nodeByContent.set(content, node);

        // Add data-status for diff mode
        if (this.isDiffMode && 'status' in node) {
            content.setAttribute('data-status', (node as MergedZipNode).status);
        }

        content.style.paddingLeft = `${level * 12 + 8}px`;
        content.style.display = 'flex';
        content.style.alignItems = 'center';

        if (selectedPath === node.path) {
            content.classList.add('selected');
        }

        const leftContainer = document.createElement('div');
        leftContainer.style.display = 'flex';
        leftContainer.style.alignItems = 'center';
        leftContainer.style.flex = '1';
        leftContainer.style.minWidth = '0';

        // Toggle Icon
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.style.display = 'inline-block';
        toggle.style.width = '16px';
        toggle.style.textAlign = 'center';
        toggle.style.marginRight = '4px';
        toggle.style.transition = 'transform 0.1s';

        if (node.isDir) {
            toggle.textContent = '▶';
            toggle.style.fontSize = '10px';
            toggle.style.color = '#9ca3af';
        } else {
            toggle.innerHTML = '&nbsp;';
        }
        leftContainer.appendChild(toggle);

        // Diff Status Icon (only in diff mode)
        if (this.isDiffMode && 'status' in node) {
            const statusIcon = document.createElement('span');
            statusIcon.className = 'tree-status-icon';
            statusIcon.innerHTML = getDiffStatusIcon((node as MergedZipNode).status);
            statusIcon.style.display = 'inline-flex';
            statusIcon.style.alignItems = 'center';
            statusIcon.style.marginRight = '4px';
            leftContainer.appendChild(statusIcon);
        }

        // File/Folder Icon
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        const iconData = this.getIcon(node);
        if (iconData.type === 'svg') {
            icon.innerHTML = iconData.content;
        } else {
            icon.textContent = iconData.content;
        }
        leftContainer.appendChild(icon);

        // Label
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.name;
        label.style.flex = '1';
        label.style.minWidth = '0';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.whiteSpace = 'nowrap';
        leftContainer.appendChild(label);

        content.appendChild(leftContainer);

        // Delete Button
        const deleteBtn = this.createDeleteButton(node, onDelete);
        content.appendChild(deleteBtn);

        content.addEventListener('mouseenter', () => {
            deleteBtn.style.visibility = 'visible';
        });
        content.addEventListener('mouseleave', () => {
            deleteBtn.style.visibility = 'hidden';
        });

        li.appendChild(content);

        // Children Container
        let childrenContainer: HTMLElement | null = null;
        if (node.isDir && node.children) {
            childrenContainer = document.createElement('ul');
            childrenContainer.className = 'tree-children';
            // Sort children as well
            const sortedChildren = this.sortNodes(node.children as T[]);
            sortedChildren.forEach(child => {
                childrenContainer!.appendChild(this.createTreeNode(child as T, onSelect, onDelete, selectedPath, level + 1));
            });
            li.appendChild(childrenContainer);
        }

        // Event Handling
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            this.container.focus();
            this.selectContent(content);

            if (node.isDir) {
                if (childrenContainer) {
                    childrenContainer.classList.toggle('open');
                    const isOpen = childrenContainer.classList.contains('open');
                    toggle.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                    icon.textContent = isOpen ? '📂' : '📁';
                }
            } else {
                onSelect(node);
            }
        });

        return li;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) return;

        let current = this.getSelectedContent() ?? this.getVisibleContents()[0];
        if (!current) return;

        e.preventDefault();
        e.stopPropagation();

        if (!this.getSelectedContent()) {
            this.selectContent(current);
            current = this.getSelectedContent() ?? current;
        }

        switch (e.key) {
            case 'ArrowUp':
                this.moveSelection(-1);
                break;
            case 'ArrowDown':
                this.moveSelection(1);
                break;
            case 'ArrowRight':
                this.expandOrEnterFolder(current);
                break;
            case 'ArrowLeft':
                this.collapseOrSelectParent(current);
                break;
            case 'Enter':
                this.activateContent(current);
                break;
        }
    }

    private getVisibleContents(): HTMLElement[] {
        return Array.from(this.container.querySelectorAll<HTMLElement>('.tree-content'))
            .filter(content => content.offsetParent !== null);
    }

    private getSelectedContent(): HTMLElement | null {
        return this.container.querySelector<HTMLElement>('.tree-content.selected');
    }

    private selectContent(content: HTMLElement): void {
        const prevSelected = this.getSelectedContent();
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }

        content.classList.add('selected');
        content.scrollIntoView({ block: 'nearest' });
    }

    private moveSelection(offset: number): void {
        const visibleContents = this.getVisibleContents();
        const current = this.getSelectedContent();
        if (visibleContents.length === 0) return;

        const currentIndex = current ? visibleContents.indexOf(current) : -1;
        const nextIndex = Math.min(Math.max(currentIndex + offset, 0), visibleContents.length - 1);
        this.selectContent(visibleContents[nextIndex]);
    }

    private expandOrEnterFolder(content: HTMLElement): void {
        const childrenContainer = this.getChildrenContainer(content);
        if (!childrenContainer) return;

        if (!childrenContainer.classList.contains('open')) {
            this.setFolderOpen(content, true);
            return;
        }

        const firstChild = childrenContainer.querySelector<HTMLElement>(':scope > li > .tree-content');
        if (firstChild) {
            this.selectContent(firstChild);
        }
    }

    private collapseOrSelectParent(content: HTMLElement): void {
        const childrenContainer = this.getChildrenContainer(content);
        if (childrenContainer?.classList.contains('open')) {
            this.setFolderOpen(content, false);
            return;
        }

        const parentChildren = content.parentElement?.parentElement;
        if (!parentChildren?.classList.contains('tree-children')) return;

        const parentContent = parentChildren.parentElement?.querySelector<HTMLElement>(':scope > .tree-content');
        if (parentContent) {
            this.selectContent(parentContent);
        }
    }

    private activateContent(content: HTMLElement): void {
        const node = this.nodeByContent.get(content);
        if (!node) return;

        if (node.isDir) {
            this.toggleFolder(content);
            return;
        }

        this.onSelect?.(node);
    }

    private toggleFolder(content: HTMLElement): void {
        const childrenContainer = this.getChildrenContainer(content);
        if (!childrenContainer) return;

        this.setFolderOpen(content, !childrenContainer.classList.contains('open'));
    }

    private setFolderOpen(content: HTMLElement, isOpen: boolean): void {
        const childrenContainer = this.getChildrenContainer(content);
        if (!childrenContainer) return;

        childrenContainer.classList.toggle('open', isOpen);
        this.updateFolderVisualState(content, isOpen);
    }

    private updateFolderVisualState(content: HTMLElement, isOpen: boolean): void {
        const toggle = content.querySelector<HTMLElement>('.tree-toggle');
        const icon = content.querySelector<HTMLElement>('.tree-icon');
        if (toggle) toggle.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
        if (icon) icon.textContent = isOpen ? '📂' : '📁';
    }

    private getChildrenContainer(content: HTMLElement): HTMLElement | null {
        return content.parentElement?.querySelector<HTMLElement>(':scope > .tree-children') ?? null;
    }

    protected createDeleteButton<T extends ZipNode | MergedZipNode>(
        node: T,
        onDelete: (node: T) => void
    ): HTMLButtonElement {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tree-delete-btn';
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
        deleteBtn.style.padding = '2px 4px';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.color = '#9ca3af';
        deleteBtn.style.visibility = 'hidden';
        deleteBtn.style.flexShrink = '0';
        deleteBtn.title = 'Delete';

        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.color = '#ef4444';
        });
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.color = '#9ca3af';
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(node);
        });

        return deleteBtn;
    }

    protected getIcon(node: ZipNode): { type: 'text' | 'svg', content: string } {
        if (node.isDir) return { type: 'text', content: '📁' };
        if (node.name.endsWith('.xml')) return {
            type: 'svg',
            content: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e06c75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 3 3 3-3"/><path d="M12 12v6"/></svg>`
        };
        if (node.name.match(/\.(png|jpg|jpeg|gif)$/i)) return { type: 'text', content: '🖼️' };
        return { type: 'text', content: '📄' };
    }
}
