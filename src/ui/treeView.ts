import type { ZipNode } from '../utils/zipHandler';

function createDeleteButton(node: ZipNode, onDelete: (node: ZipNode) => void): HTMLButtonElement {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tree-delete-btn';
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
    deleteBtn.style.padding = '2px 4px';
    deleteBtn.style.marginLeft = '8px';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.border = 'none';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.color = '#9ca3af';
    deleteBtn.style.display = 'none';
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

export function renderFileTree(
    container: HTMLElement,
    nodes: ZipNode[],
    onSelect: (node: ZipNode) => void,
    onDelete: (node: ZipNode) => void,
    selectedPath?: string
) {
    container.innerHTML = '';
    const ul = document.createElement('ul');
    ul.style.paddingLeft = '0';

    nodes.forEach(node => {
        ul.appendChild(createTreeNode(node, onSelect, onDelete, selectedPath, 0));
    });

    container.appendChild(ul);
}

export function highlightTreeNode(container: HTMLElement, path: string | null) {
    if (path) console.log(`[Debug] highlightTreeNode called with path: ${path}`);
    // Remove existing highlights
    const highlighted = container.querySelectorAll('.tree-content.hover-highlight');
    highlighted.forEach(el => el.classList.remove('hover-highlight'));

    if (path) {
        // Add new highlight
        const safePath = path.replace(/"/g, '\\"');
        let target = container.querySelector(`.tree-content[data-path="${safePath}"]`);

        // Try alternative path (add/remove leading slash) if not found
        if (!target) {
            const altPath = safePath.startsWith('/') ? safePath.substring(1) : `/${safePath}`;
            target = container.querySelector(`.tree-content[data-path="${altPath}"]`);
        }

        if (target) {
            target.classList.add('hover-highlight');

            // Expand parent folders
            let parent = target.parentElement; // li
            while (parent) {
                if (parent.tagName === 'UL' && parent.classList.contains('tree-children')) {
                    parent.classList.add('open');
                    // Update toggle icon of the parent li
                    const parentLi = parent.parentElement;
                    if (parentLi) {
                        const toggle = parentLi.querySelector('.tree-toggle') as HTMLElement;
                        const icon = parentLi.querySelector('.tree-icon') as HTMLElement;
                        if (toggle) toggle.style.transform = 'rotate(90deg)';
                        if (icon) icon.textContent = '📂';
                    }
                }
                parent = parent.parentElement;
                if (parent === container) break;
            }

            target.scrollIntoView({ block: 'nearest' });
        } else {
            console.log(`[Debug] Target element not found for path: ${path}`);
        }
    }
}

function createTreeNode(
    node: ZipNode,
    onSelect: (node: ZipNode) => void,
    onDelete: (node: ZipNode) => void,
    selectedPath: string | undefined,
    level: number
): HTMLElement {
    const li = document.createElement('li');

    // Node Content
    const content = document.createElement('div');
    content.className = 'tree-content';
    content.setAttribute('data-path', node.path);
    content.style.paddingLeft = `${level * 12 + 8}px`;
    content.style.display = 'flex';
    content.style.alignItems = 'center';

    if (selectedPath === node.path) {
        content.classList.add('selected');
    }

    // Left side container (toggle + icon + label)
    const leftContainer = document.createElement('div');
    leftContainer.style.display = 'flex';
    leftContainer.style.alignItems = 'center';
    leftContainer.style.flex = '1';
    leftContainer.style.minWidth = '0';

    // Toggle Icon (Triangle)
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

    // File/Folder Icon
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    const iconData = getIcon(node);
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
    const deleteBtn = createDeleteButton(node, onDelete);
    content.appendChild(deleteBtn);

    // Show delete button on hover
    content.addEventListener('mouseenter', () => {
        deleteBtn.style.display = 'inline-block';
    });
    content.addEventListener('mouseleave', () => {
        deleteBtn.style.display = 'none';
    });

    li.appendChild(content);

    // Children Container
    let childrenContainer: HTMLElement | null = null;
    if (node.isDir && node.children) {
        childrenContainer = document.createElement('ul');
        childrenContainer.className = 'tree-children';
        node.children.forEach(child => {
            childrenContainer!.appendChild(createTreeNode(child, onSelect, onDelete, selectedPath, level + 1));
        });
        li.appendChild(childrenContainer);
    }

    // Event Handling
    content.addEventListener('click', (e) => {
        e.stopPropagation();
        if (node.isDir) {
            if (childrenContainer) {
                childrenContainer.classList.toggle('open');
                const isOpen = childrenContainer.classList.contains('open');
                toggle.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                icon.textContent = isOpen ? '📂' : '📁';
            }
        } else {
            // Deselect previous
            const prevSelected = document.querySelector('.tree-content.selected');
            if (prevSelected) prevSelected.classList.remove('selected');

            content.classList.add('selected');
            onSelect(node);
        }
    });

    return li;
}

function getIcon(node: ZipNode): { type: 'text' | 'svg', content: string } {
    if (node.isDir) return { type: 'text', content: '📁' };
    if (node.name.endsWith('.xml')) return {
        type: 'svg',
        content: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e06c75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 3 3 3-3"/><path d="M12 12v6"/></svg>`
    }; // Reddish file icon
    if (node.name.match(/\.(png|jpg|jpeg|gif)$/i)) return { type: 'text', content: '🖼️' };
    return { type: 'text', content: '📄' };
}
