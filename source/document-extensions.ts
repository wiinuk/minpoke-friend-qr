export function waitElementLoaded() {
    if (document.readyState !== "loading") {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) =>
        document.addEventListener("DOMContentLoaded", () => resolve())
    );
}

type CssSourceParts = string | number;
let styleElement: HTMLStyleElement | null = null;
export function addStyle(css: string): void;
export function addStyle(
    template: TemplateStringsArray,
    ...substitutions: CssSourceParts[]
): void;
export function addStyle(
    cssOrTemplate: TemplateStringsArray | string,
    ...substitutions: CssSourceParts[]
) {
    const css =
        typeof cssOrTemplate === "string"
            ? cssOrTemplate
            : String.raw(cssOrTemplate, ...substitutions);

    if (styleElement == null) {
        styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
    }
    styleElement.textContent += css + "\n";
    document.head.appendChild(styleElement);
}

export async function replaceAllTextToElement(
    element: Element,
    pattern: RegExp,
    matchedTextToElement: (text: string) => Promise<Element>
) {
    async function replaceNode(node: Node): Promise<Node> {
        const { parentElement: parent } = node;
        if (node.nodeType === Node.TEXT_NODE && parent) {
            const contents = node.textContent ?? "";
            const match = contents.match(pattern);
            if (match && match.index !== undefined && match[0] !== undefined) {
                const { index } = match;
                const [{ length }] = match;

                const before = document.createTextNode(
                    contents.substring(0, index)
                );
                const newElement = await matchedTextToElement(
                    contents.substring(index, index + length)
                );
                const after = document.createTextNode(
                    contents.substring(index + length)
                );
                parent.insertBefore(before, node);
                parent.insertBefore(newElement, node);
                parent.insertBefore(after, node);
                parent.removeChild(node);

                await replaceNode(after);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            node.childNodes.forEach(replaceNode);
        }
        return node;
    }
    element.childNodes.forEach(replaceNode);
    return element;
}
