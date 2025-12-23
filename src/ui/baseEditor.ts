import { ZipHandler } from '../utils/zipHandler';
import xmlFormatter from 'xml-formatter';
import { hoverTooltip } from "@codemirror/view";

/**
 * Base class for editors with common relationship handling
 * Extracted from original Editor class
 */
export abstract class BaseEditor {
    protected zipHandler: ZipHandler;
    protected relsMap: Map<string, string> = new Map();
    protected onHoverTarget: (path: string | null) => void;

    constructor(zipHandler: ZipHandler, onHoverTarget: (path: string | null) => void) {
        this.zipHandler = zipHandler;
        this.onHoverTarget = onHoverTarget;
    }

    /**
     * Load and parse .rels file for a given XML file
     */
    protected async loadRelsFile(xmlPath: string, targetMap: Map<string, string> = this.relsMap, zipHandler: ZipHandler = this.zipHandler): Promise<void> {
        targetMap.clear();
        const parts = xmlPath.split('/');
        const fileName = parts.pop();
        const folder = parts.join('/');

        // Construct .rels path: folder/_rels/fileName.rels
        const relsFolder = folder ? `${folder}/_rels` : '_rels';
        const relsPath = `${relsFolder}/${fileName}.rels`;

        try {
            const content = await zipHandler.getFileContent(relsPath);
            if (typeof content === 'string') {
                this.parseRelsContent(content, folder, targetMap);
            }
        } catch (e) {
            // .rels file might not exist, which is fine
            console.log(`[Debug] No .rels file found for ${xmlPath}`);
        }
    }

    /**
     * Parse .rels XML content and extract relationships
     */
    protected parseRelsContent(content: string, folder: string, targetMap: Map<string, string> = this.relsMap): void {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const relationships = xmlDoc.getElementsByTagName("Relationship");

        for (let i = 0; i < relationships.length; i++) {
            const rel = relationships[i];
            const id = rel.getAttribute("Id");
            const target = rel.getAttribute("Target");

            if (id && target) {
                const resolvedPath = this.resolveRelativePath(target, folder);
                targetMap.set(id, resolvedPath);
            }
        }
        console.log(`[Debug] Loaded ${targetMap.size} relationships`, targetMap);
    }

    /**
     * Resolve relative paths in relationship targets
     */
    protected resolveRelativePath(target: string, folder: string): string {
        // Skip external URLs
        if (target.startsWith('http') || target.includes(':')) {
            return target;
        }

        // Handle absolute paths
        if (target.startsWith('/')) {
            return target.substring(1);
        }

        // Resolve relative paths
        const currentDirParts = folder ? folder.split('/') : [];
        const targetParts = target.split('/');

        for (const part of targetParts) {
            if (part === '..') {
                currentDirParts.pop();
            } else if (part !== '.') {
                currentDirParts.push(part);
            }
        }

        return currentDirParts.join('/');
    }

    /**
     * Create relationship tooltip for rId references (uses this.relsMap)
     */
    protected createRelationshipTooltip() {
        return this.createRelationshipTooltipWithMap(this.relsMap);
    }

    /**
     * Create relationship tooltip with a specific relsMap
     * Can be used by subclasses with multiple relsMaps
     */
    protected createRelationshipTooltipWithMap(relsMap: Map<string, string>) {
        return hoverTooltip((view, pos) => {
            const { from, to, text } = view.state.doc.lineAt(pos);
            let start = pos, end = pos;
            while (start > from && /\w/.test(text[start - from - 1])) start--;
            while (end < to && /\w/.test(text[end - from])) end++;

            if (start == end) return null;

            const word = text.slice(start - from, end - from);
            const target = relsMap.get(word);

            if (target) {
                console.log(`[Debug] Hovered: ${word}, Target: ${target}`);
                return {
                    pos: start,
                    end,
                    above: true,
                    create: () => {
                        this.onHoverTarget(target);
                        const dom = document.createElement("div");
                        dom.textContent = `Target: ${target}`;

                        return {
                            dom,
                            destroy: () => {
                                this.onHoverTarget(null);
                            }
                        };
                    }
                };
            }
            return null;
        });
    }

    /**
     * Format XML content
     */
    protected formatXml(content: string): string {
        try {
            return xmlFormatter(content, {
                indentation: '  ',
                collapseContent: true,
                lineSeparator: '\n'
            });
        } catch (e) {
            // Return original if formatting fails
            return content;
        }
    }
}
