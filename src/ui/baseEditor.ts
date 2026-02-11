import { ZipHandler } from '../utils/zipHandler';
import xmlFormatter from 'xml-formatter';
import * as monaco from 'monaco-editor';
import { normalizeXmlAttributes } from '../utils/diffUtils';

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
        } catch {
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
     * Create Monaco hover provider for rId references (uses this.relsMap)
     */
    protected createHoverProvider(
        _editor: monaco.editor.IStandaloneCodeEditor,
        relsMap: Map<string, string> = this.relsMap
    ): monaco.IDisposable {
        return monaco.languages.registerHoverProvider('xml', {
            provideHover: (model, position) => {
                const word = model.getWordAtPosition(position);
                if (!word) {
                    this.onHoverTarget(null);
                    return null;
                }

                const target = relsMap.get(word.word);
                if (target) {
                    console.log(`[Debug] Hovered: ${word.word}, Target: ${target}`);
                    this.onHoverTarget(target);
                    return {
                        range: new monaco.Range(
                            position.lineNumber,
                            word.startColumn,
                            position.lineNumber,
                            word.endColumn
                        ),
                        contents: [{ value: `**Target:** ${target}` }]
                    };
                }

                this.onHoverTarget(null);
                return null;
            }
        });
    }

    /**
     * Format XML content for display
     * - Sorts attributes alphabetically for consistent formatting
     * - Pretty-prints with proper indentation
     * - Normalizes line endings and tabs
     */
    protected formatXml(content: string): string {
        try {
            // Sort attributes for consistent formatting
            const normalized = normalizeXmlAttributes(content);
            const formatted = xmlFormatter(normalized, {
                indentation: '  ',
                collapseContent: true,
                lineSeparator: '\n'
            });

            // Ensure consistent line endings and remove any problematic characters
            return formatted
                .replace(/\r\n/g, '\n')  // Convert CRLF to LF
                .replace(/\r/g, '\n')    // Convert CR to LF
                .replace(/\t/g, '  ');   // Convert tabs to 2 spaces
        } catch {
            // Return original if formatting fails
            return content;
        }
    }
}
