type HTMLAttributeNameAndType<
    TTagName extends keyof HTMLElementTagNameMap,
    TPropertyName extends keyof HTMLElementTagNameMap[TTagName]
> = TPropertyName extends "classList"
    ? { name: "class"; type: string }
    : TPropertyName extends "htmlFor"
    ? { name: "for"; type: string }
    : HTMLElementTagNameMap[TTagName][TPropertyName] extends
          | string
          | boolean
          | number
    ? {
          name: TPropertyName;
          type: HTMLElementTagNameMap[TTagName][TPropertyName];
      }
    : { name: never; type: never };

type ElementProperties<TName extends keyof HTMLElementTagNameMap> = {
    [k in keyof HTMLElementTagNameMap[TName] as HTMLAttributeNameAndType<
        TName,
        k
    >["name"]]?: HTMLAttributeNameAndType<TName, k>["type"];
};
type falsy = false | null | undefined | 0 | "" | void;
interface JsxOption {
    key?: string | number;
}
type Children = readonly (HTMLElement | string | falsy)[];
type ChildrenProperty =
    | readonly (HTMLElement | string | falsy)[]
    | HTMLElement
    | string
    | falsy;

export function jsxs<TName extends keyof HTMLElementTagNameMap>(
    name: TName,
    properties: Readonly<
        ElementProperties<TName> & {
            children?: ChildrenProperty;
        }
    > | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _option?: JsxOption
): HTMLElementTagNameMap[TName] {
    const element = document.createElement(name);
    for (const [key, value] of Object.entries(properties ?? {})) {
        if (key === "children") continue;
        element.setAttribute(key, String(value));
    }
    const children = properties?.children;
    if (children) {
        if (Array.isArray(children)) {
            for (const child of children as Children) {
                if (!child) continue;
                element.append(child);
            }
        } else {
            element.append(children as HTMLElement | string);
        }
    }
    return element;
}
export const jsx = jsxs;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
    export type Element = HTMLElement;
    export type IntrinsicElements = {
        [tagName in keyof HTMLElementTagNameMap]: ElementProperties<tagName>;
    };
}
