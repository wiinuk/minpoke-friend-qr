/* eslint-disable rulesdir/no-unused-await */

import qrCode from "qrcode";
import {
    addStyle,
    replaceAllTextToElement,
    waitElementLoaded,
} from "./document-extensions";
import { createGeonamesClient } from "./geonames";
import { createPhysicalAnimator } from "./physical-element-animator";

function id<T>(x: T) {
    return x;
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
export function* getCodes(contents: string) {
    for (const match of contents.matchAll(/(\d[^\d\w]*){12}/g)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        yield match[0]!.replace(/\D/g, "");
    }
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
async function searchLocationInfo(query: string) {
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
export function* getPartialLocationTexts(originalText: string) {
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
    for (const searchText of getPartialLocationTexts(locationText)) {
        const info = await searchLocationInfo(searchText);
        if (info) return { ...info, searchText };
    }
}

const locationPattern =
    /(?<=Location\s*[：:]?\s*|\b(live\s+in|from)\b\s*[：:]?\s*)([\p{L}\p{Nd}\p{Mn}\p{Pc}].*?)(?=[!?。．\r\n]|\.\s|$)/iu;

export function getLocationPattern() {
    return new RegExp(locationPattern, locationPattern.flags + "g");
}
async function asyncMain() {
    await waitElementLoaded();

    const idContainerName = "id-code-container";
    const qrNumberName = "qr-number";
    const qrContainerName = "qr-container";
    const qrCheckboxName = "qr-checkbox";
    const qrLabelName = "qr-label";
    const qrName = "qr";
    const qrChasingName = "qr-chasing";
    const qrDraggingName = "qr-dragging";
    const qrCodeContainerName = "qr-code-container";
    const qrLocationFlagName = "qr-location-flag";
    const qrLocationName = "qr-location";
    const qrRegionNameName = "qr-region-name";
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
        .${qrCodeContainerName} {
            width: 0;
            height: 0;
        }
        .${qrCheckboxName}:checked + .${qrLabelName} + .${qrCodeContainerName} {
            transform: scale(1);
            opacity: 1;
        }
        .${qrCheckboxName} {
            display: none;
        }
        .${qrLocationName} {
            background: rgb(0 99 223 / 10%);
        }
        .${qrLocationFlagName} {
            height: 0.5em;
            margin: 0.2em;
        }
        .${qrRegionNameName} {
            vertical-align: super;
            font-size: 0.6em;
        }
        .${qrCodeContainerName} {
            position: fixed;
            top: 50%;
            left: 50%;
            z-index: 9999;
            cursor: grab;

            border-radius: 50%;

            background-color: #ffffff00;
            background-image:
                radial-gradient(circle at center center, #bbbbbb00, #ffffff00),
                repeating-radial-gradient(circle at center center, #bbbbbb00, #bbbbbb2e, 4px, transparent 8px, transparent 4px);
            background-blend-mode: multiply;

            padding: 1.5rem;
            box-shadow: 0 0.2rem 1rem 0.5rem rgb(0 0 0 / 10%);
            border: solid 1px #ccc;
            backdrop-filter: blur(0.3rem);

            transition:
                background-color 1s,
                box-shadow 1s,
                border 1s,
                transform 0.2s ease-out,
                opacity 0.2s ease-out;

            width: 7rem;
            height: 7rem;
            transform: scale(0.1);
            opacity: 0;
        }
        .${qrCodeContainerName}:hover {
            background-color: rgb(192 164 197 / 20%);
            box-shadow: 0 0.2em 1em 0.5em rgb(250 220 255 / 30%);
            border: solid 1px #cab8cb;
        }
        .${qrCodeContainerName}.${qrChasingName} {
            background-color: rgb(131 179 193 / 20%);
            box-shadow: 0 0.2em 1em 0.5em rgb(171 236 255 / 30%);
            border: solid 1px #afc6c7;
        }
        .${qrCodeContainerName}.${qrDraggingName} {
            background-color: rgb(187 134 197 / 20%);
            box-shadow: 0 0.2em 1em 0.5em rgb(243 177 255 / 30%);
            border: solid 1px #c9a6cb;
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
    const toastListElement = <ul class={toastListName} />;
    document.body.appendChild(toastListElement);
    async function toast(message: string, { timeout = 3000 } = {}) {
        const item = <li class={toastItemName}>{message}</li>;
        toastListElement.insertBefore(item, toastListElement.firstElementChild);
        await sleep(timeout);
        item.parentElement?.removeChild(item);
    }
    let nextCheckboxId = 0;
    async function createQRElement(code: string) {
        const qrCodeElement = await createQRCodeElement(code);
        qrCodeElement.classList.add(qrName);
        const qrCodeContainerElement = (
            <div class={qrCodeContainerName}>{qrCodeElement}</div>
        );

        const checkboxId = `qr-checkbox-${nextCheckboxId++}`;
        const qrContainerElement = (
            <span class={qrContainerName} title="QR コードを表示">
                <input type="checkbox" class={qrCheckboxName} id={checkboxId} />
                <label class={qrLabelName} for={checkboxId}>
                    QR 📸
                </label>
                {qrCodeContainerElement}
            </span>
        );
        const animator = createPhysicalAnimator(qrCodeContainerElement, {
            draggingClassName: qrDraggingName,
            chasingClassName: qrChasingName,
            initialChasingTargetElement: qrContainerElement,
        });
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
                    animator.start();
                } else {
                    animator.stop();
                }
            });

        return qrContainerElement;
    }
    function createCodeCopyButton(code: string) {
        const copyButton = (
            <button type="button" title={`${code} をクリップボードにコピー`}>
                📋
            </button>
        );
        copyButton.addEventListener("click", () => {
            handleAsyncError(
                (async () => {
                    await navigator.clipboard.writeText(code);
                    await toast(`${code} をクリップボードにコピーしました`);
                })()
            );
        });
        return copyButton;
    }
    async function appendCodeUI(
        parentElement: Element,
        comment: string,
        copyButton: boolean
    ) {
        const codes = unique(getCodes(comment));
        for (const code of codes) {
            parentElement.appendChild(
                <span class={idContainerName}>
                    {1 < codes.length && <div class={qrNumberName}>{code}</div>}
                    {copyButton && createCodeCopyButton(code)}
                    {await createQRElement(code)}
                </span>
            );
        }
    }
    const regionDisplayNames = new Intl.DisplayNames([], { type: "region" });
    async function createLocationUI(sourceText: string) {
        const country = await searchLocationInfoHeuristic(sourceText);
        const { searchText, countryCode, countryName } = country ?? {
            searchText: sourceText,
            countryCode: "un",
            countryName: "unknown country",
        };
        const regionDisplayName =
            regionDisplayNames.of(countryCode) || countryName;

        // `sourceText` の中の `searchText` を選択する
        let selectIndex = sourceText.indexOf(searchText);
        let selectLength = searchText.length;
        // 見つからない場合は `sourceText` 全体を選択する
        if (selectIndex < 0) {
            selectIndex = 0;
            selectLength = sourceText.length;
        }
        const selectedText = sourceText.substring(
            selectIndex,
            selectIndex + selectLength
        );
        const linkURL = `https://www.geonames.org/search.html?q=${encodeURIComponent(
            selectedText
        )}`;
        return (
            <span>
                {sourceText.substring(0, selectIndex)}
                <a
                    class={qrLocationName}
                    href={linkURL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {selectedText}
                    <span class={qrRegionNameName}>{regionDisplayName}</span>
                    <img
                        class={qrLocationFlagName}
                        src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
                        width={16}
                        title={
                            selectedText !== searchText
                                ? `${selectedText} ⇒ ${regionDisplayName}`
                                : regionDisplayName
                        }
                        alt={regionDisplayName}
                    />
                </a>
                {sourceText.substring(selectIndex + selectLength)}
            </span>
        );
    }
    async function modifyCommentListUI({ copyButton = true } = {}) {
        await Promise.all(
            Array.from(document.querySelectorAll(".comment")).map(
                async (commentElement) => {
                    const parentElement =
                        commentElement.parentElement?.querySelector(
                            ".header > .left"
                        );
                    if (parentElement == null) {
                        console.error("親要素が見つかりませんでした。");
                        return;
                    }
                    const comment = commentElement.textContent ?? "";
                    await appendCodeUI(parentElement, comment, copyButton);
                    await replaceAllTextToElement(
                        commentElement,
                        locationPattern,
                        createLocationUI
                    );
                }
            )
        );
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
