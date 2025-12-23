/**
 * DOM utility functions for creating styled elements
 */

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: {
        className?: string;
        textContent?: string;
        innerHTML?: string;
        style?: Partial<CSSStyleDeclaration>;
        attributes?: Record<string, string>;
    }
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);

    if (options?.className) {
        element.className = options.className;
    }

    if (options?.textContent) {
        element.textContent = options.textContent;
    }

    if (options?.innerHTML) {
        element.innerHTML = options.innerHTML;
    }

    if (options?.style) {
        Object.assign(element.style, options.style);
    }

    if (options?.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    return element;
}
