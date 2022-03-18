/* eslint-disable rulesdir/no-unused-await */

import qrCode from "qrcode";
import {
    addStyle,
    createElement,
    replaceAllTextToElement,
    waitElementLoaded,
} from "./document-extensions";
import { createGeonamesClient } from "./geonames";

function id<T>(x: T) {
    return x;
}
function memoize<T, U>(process: (input: T) => U): (input: T) => U {
    const cache = new Map<T, U>();
    return (input: T) => {
        if (cache.has(input)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return cache.get(input)!;
        }
        const result = process(input);
        cache.set(input, result);
        return result;
    };
}

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}
function sleep(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

const setCache: Set<unknown>[] = [];
function unique<T>(array: Iterable<T> | readonly T[]): T[];
function unique<T, K>(
    array: Iterable<T> | readonly T[],
    getKey: (element: T) => K
): T[];
function unique<T>(
    array: Iterable<T> | readonly T[],
    getKey?: (element: T) => unknown
) {
    const set = setCache.pop() ?? new Set<unknown>();
    getKey ??= id;
    try {
        const result = [];
        for (const item of array) {
            const key = getKey(item);
            if (!set.has(key)) {
                set.add(key);
                result.push(item);
            }
        }
        return result;
    } finally {
        set.clear();
        setCache.push(set);
    }
}
function getCodes(contents: string) {
    return [...contents.matchAll(/(\d\s*){12}/g)].map((match) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        match[0]!.replace(/\s/g, "")
    );
}
let domParser: DOMParser | null = null;
async function createQRCodeElement(code: string) {
    const svgContents = await qrCode.toString(code, { type: "svg" });
    const document = (domParser ??= new DOMParser()).parseFromString(
        svgContents,
        "image/svg+xml"
    ) as XMLDocument;
    return document.firstChild as SVGSVGElement;
}

const geonames = createGeonamesClient("tkxtk");
interface LocationInfo {
    countryName: string;
    countryCode: string;
}
async function searchLocationInfo(
    query: string
): Promise<LocationInfo | undefined> {
    const result = await geonames.search({
        q: query,
    });
    for (const geoname of result.geonames) {
        if (!("countryCode" in geoname)) return;

        const { countryCode, countryName } = geoname;
        if (countryCode == null || countryName == null) return;

        return { countryCode, countryName };
    }
    return;
}
export function* getHeuristicLocationTexts(originalText: string) {
    yield originalText;
    /**
     * L: letter
     * N: number
     * Mc: spacing combining mark
     * Mn: non-spacing mark
     * Pc: connector punctuation
     * Cf: format other
     */
    const tokenPattern = /[\p{L}\p{N}\p{Mc}\p{Mn}\p{Pc}\p{Cf}]+/gu;
    const tokens = [...originalText.matchAll(tokenPattern)];
    for (let i = tokens.length; 1 <= i; i--) {
        yield tokens.slice(0, i).join(" ");
    }
}
async function searchLocationInfoHeuristic(locationText: string) {
    for (const searchText of getHeuristicLocationTexts(locationText)) {
        const info = await searchLocationInfo(searchText);
        if (info) return { ...info, searchText };
    }
}

async function asyncMain() {
    await waitElementLoaded();

    const idContainerName = "id-code-container";
    const qrNumberName = "qr-number";
    const qrContainerName = "qr-container";
    const qrCheckboxName = "qr-checkbox";
    const qrLabelName = "qr-label";
    const qrName = "qr";
    const qrLocationFlagName = "qr-location-flag";
    const qrLocationName = "qr-location";
    addStyle`
        .${idContainerName} {
            float: right;
            display: flex;
            padding: 0;
            margin: 0 0.5em;
            border: 2px solid #ddd;
        }
        .${qrNumberName} {
            padding: 0 0.5em;
            border-right: 2px dashed #ddd;
        }
        .${qrName} {
            width: 0;
            height: 0;
        }
        .${qrCheckboxName}:checked + .${qrLabelName} + .${qrName} {
            width: 5em;
            height: 5em;
        }
        .${qrCheckboxName} {
            display: none;
        }
        .${qrLocationName} {
            background: rgb(0 99 223 / 10%);
        }
        .${qrLocationFlagName} {
            width: 1.2em;
            margin: 0.2em;
        }
        `;
    const toastListName = "qr-toast-list";
    const toastItemName = "qr-toast-item";
    addStyle`
        .${toastListName} {
            position: fixed;
            right: 0;
            bottom: 0;
            z-index: 9999;
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .${toastItemName}:first-of-type {
            border-top: 1px solid #ddd;
        }
        .${toastItemName} {
            background-color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-top: 1px dashed #ccc;
            margin: 0 0.5em;
            padding: 1em;
            box-shadow: 0 2px 2px rgb(0 0 0 / 50%);
        }
    `;
    const toastListElement = document.createElement("ul");
    toastListElement.classList.add(toastListName);
    document.body.appendChild(toastListElement);
    async function toast(message: string, { timeout = 3000 } = {}) {
        const item = document.createElement("li");
        item.innerText = message;
        item.classList.add(toastItemName);
        toastListElement.insertBefore(item, toastListElement.firstElementChild);
        await sleep(timeout);
        item.parentElement?.removeChild(item);
    }
    let nextCheckboxId = 0;
    async function createQRElement(code: string) {
        const qrContainerElement = document.createElement("span");
        qrContainerElement.classList.add(qrContainerName);
        qrContainerElement.title = "QR コードを表示";

        const checkboxId = `qr-checkbox-${nextCheckboxId++}`;
        qrContainerElement.innerHTML = `
        <input type="checkbox" class="${qrCheckboxName}" id="${checkboxId}" />
        <label type="button" class="${qrLabelName}" for="${checkboxId}">QR 📸</label>
    `;

        const qrCodeElement = await createQRCodeElement(code);
        qrCodeElement.classList.add(qrName);
        qrContainerElement.appendChild(qrCodeElement);
        qrContainerElement
            .querySelector("input")
            ?.addEventListener("click", function () {
                if (this.checked) {
                    document
                        .querySelectorAll(`input.${qrCheckboxName}`)
                        .forEach((element) => {
                            const otherCheckbox = element as HTMLInputElement;
                            if (otherCheckbox !== this) {
                                otherCheckbox.checked = false;
                            }
                        });
                }
            });

        return qrContainerElement;
    }
    async function appendCodeUI(
        parentElement: Element,
        comment: string,
        copyButton: boolean
    ) {
        const codes = unique(getCodes(comment));
        for (const code of codes) {
            const idContainerElement = document.createElement("span");
            idContainerElement.classList.add(idContainerName);
            if (1 < codes.length) {
                const numberElement = document.createElement("div");
                numberElement.innerText = code;
                numberElement.classList.add(qrNumberName);
                idContainerElement.appendChild(numberElement);
            }
            if (copyButton) {
                const copyButton = document.createElement("button");
                copyButton.innerText = `📋`;
                copyButton.title = `${code} をクリップボードにコピー`;
                copyButton.type = "button";

                copyButton.addEventListener("click", () => {
                    handleAsyncError(
                        (async () => {
                            await navigator.clipboard.writeText(code);
                            await toast(
                                `${code} をクリップボードにコピーしました`
                            );
                        })()
                    );
                });
                idContainerElement.appendChild(copyButton);
            }
            idContainerElement.appendChild(await createQRElement(code));

            parentElement.appendChild(idContainerElement);
        }
    }

    interface LocationSearchResult extends LocationInfo {
        /** 元のコメントを切り出した文字列 */
        sourceText: string;
        /** 検索した文字列 */
        searchText: string;
    }
    async function createFlagUI({
        sourceText,
        searchText,
        countryCode,
        countryName,
    }: LocationSearchResult) {
        const image = document.createElement("img");
        image.classList.add(qrLocationFlagName);
        image.src = `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
        image.width = 16;
        image.title =
            sourceText !== searchText
                ? `${searchText} ⇒ ${countryName}`
                : countryName;
        image.alt = countryName;
        return image;
    }

    const locationPattern = /(?<=Location\s*[：:]\s*)(.+)(?=\s*)/i;
    async function insertLocationUI(commentElement: Element) {
        await replaceAllTextToElement(
            commentElement,
            locationPattern,
            async (sourceText) => {
                const country = (await searchLocationInfoHeuristic(
                    sourceText
                )) ?? {
                    searchText: sourceText,
                    countryCode: "un",
                    countryName: "unknown country",
                };
                const { searchText } = country;

                // 元の文字列の中の `searchText` を選択する
                let selectIndex = sourceText.indexOf(country.searchText);
                let selectLength = searchText.length;
                // 見つからない場合は最初から最後までを選択する
                if (selectIndex < 0) {
                    selectIndex = 0;
                    selectLength = sourceText.length;
                }
                return createElement(
                    "span",
                    null,
                    sourceText.substring(0, selectIndex),
                    createElement(
                        "span",
                        { class: qrLocationName },
                        sourceText.substring(
                            selectIndex,
                            selectIndex + selectLength
                        ),
                        await createFlagUI({ ...country, sourceText })
                    ),
                    sourceText.substring(selectIndex + selectLength)
                );
            }
        );
    }
    async function modifyCommentListUI({ copyButton = true } = {}) {
        for (const commentElement of Array.from(
            document.querySelectorAll(".comment")
        )) {
            const parentElement =
                commentElement.parentElement?.querySelector(".header > .left");
            if (parentElement == null) {
                console.error("親要素が見つかりませんでした。");
                continue;
            }
            const comment = commentElement.textContent ?? "";
            await appendCodeUI(parentElement, comment, copyButton);
            await insertLocationUI(commentElement);
        }
    }
    // フレンド募集掲示板 ( 日本 )
    if (document.URL.match(/https?:\/\/9db.jp\/pokemongo\/data\/4264/)) {
        await modifyCommentListUI({ copyButton: false });
    }
    // フレンド募集掲示板 ( 海外 )
    else {
        await modifyCommentListUI();
    }
}
export function main() {
    handleAsyncError(asyncMain());
}
