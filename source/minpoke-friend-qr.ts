/* eslint-disable rulesdir/no-unused-await */

import qrCode from "qrcode";
import {
    addStyle,
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
async function searchLocationInfoRaw(
    placeName: string
): Promise<LocationInfo | undefined> {
    const result = await geonames.search({
        q: placeName,
    });
    const geoname = result.geonames[0];
    if (!geoname) {
        return;
    }
    const { countryCode, countryName } = geoname;
    return {
        countryName,
        countryCode,
    };
}
const searchLocationInfoCached = memoize(searchLocationInfoRaw);

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
    async function createLocationFlagUI({
        countryCode,
        countryName,
    }: LocationInfo) {
        const image = document.createElement("img");
        image.classList.add(qrLocationFlagName);
        image.src = `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
        image.width = 16;
        image.title = image.alt = countryName;
        return image;
    }

    const locationPattern = /(?<=Location\s*[：:]\s*)(.+)(?=\s*)/i;
    async function insertLocationUI(commentElement: Element) {
        await replaceAllTextToElement(
            commentElement,
            locationPattern,
            async (locationText) => {
                const country = (await searchLocationInfoCached(
                    locationText
                )) ?? { countryCode: "un", countryName: "unknown country" };

                const span = document.createElement("span");
                span.classList.add(qrLocationName);
                span.title = country.countryName;
                span.append(locationText, await createLocationFlagUI(country));
                return span;
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
