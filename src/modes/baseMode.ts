import { TreeView } from '../ui/treeView';
import { DELETE_ANIMATION_DURATION, CRITICAL_FILES } from '../const/constants';

/**
 * Base class for application modes (Single and Diff)
 * Provides common functionality for tree management and animations
 */
export abstract class BaseMode {
    protected sidebarTree: HTMLElement;
    protected treeView: TreeView;

    constructor(isDiffMode: boolean = false) {
        this.sidebarTree = document.getElementById('file-tree')!;
        this.treeView = new TreeView(this.sidebarTree, isDiffMode);
    }

    /**
     * Clear sidebar tree content
     */
    protected clearSidebarTree(): void {
        this.sidebarTree.innerHTML = '';
    }

    /**
     * Add critical file warning to message if node is critical
     */
    protected addCriticalFileWarning(message: string, path: string, name: string): string {
        const isCritical = CRITICAL_FILES.some(critical =>
            path.endsWith(critical) || name === critical
        );

        if (isCritical) {
            return message + '\n\n⚠️ 경고: 이 파일은 문서의 핵심 파일입니다.\n삭제하면 문서가 손상될 수 있습니다.';
        }

        return message;
    }

    /**
     * Save currently open folders
     */
    protected saveOpenFolders(): Set<string> {
        const openFolders = new Set<string>();
        this.sidebarTree.querySelectorAll('.tree-children.open').forEach(ul => {
            const li = ul.parentElement;
            if (li) {
                const content = li.querySelector('.tree-content');
                if (content) {
                    const path = content.getAttribute('data-path');
                    if (path) openFolders.add(path);
                }
            }
        });
        return openFolders;
    }

    /**
     * Restore open folders
     */
    protected restoreOpenFolders(openFolders: Set<string>): void {
        openFolders.forEach(path => {
            const safePath = path.replace(/"/g, '\\"');
            const content = this.sidebarTree.querySelector(`.tree-content[data-path="${safePath}"]`);
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

    /**
     * Animate node deletion
     */
    protected animateNodeDeletion(path: string): void {
        const safePath = path.replace(/"/g, '\\"');
        const treeContent = this.sidebarTree.querySelector(`.tree-content[data-path="${safePath}"]`);

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
    }

    /**
     * Wait for animation to complete
     */
    protected waitForAnimation(): Promise<void> {
        return new Promise(resolve => {
            setTimeout(resolve, DELETE_ANIMATION_DURATION);
        });
    }

    /**
     * Abstract methods to be implemented by subclasses
     */
    abstract cleanup(): void;
}
