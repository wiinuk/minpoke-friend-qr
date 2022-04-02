import {
    getCodes,
    getLocationPattern,
    getPartialLocationTexts,
    main,
} from "./minpoke-friend-qr";

describe("main", () => {
    it("main が定義されている", () => {
        expect(main).toBeDefined();
    });
});
describe(getPartialLocationTexts.name, () => {
    it("部分文字列の取得", () => {
        const getTexts = (x: string) => [...getPartialLocationTexts(x)];
        // "\u3000": IDEOGRAPHIC SPACE
        expect(
            getTexts("kanagawa japan ID:1234 5678 9012\u3000blueTL12")
        ).toContain("kanagawa japan");
        expect(getTexts("USA, Baby!")).toContain("USA");
        expect(getTexts("Santiago | Chile")).toContain("Santiago Chile");
        // "\u0301": COMBINING ACUTE ACCENT
        expect(getTexts("a\u0301b c")).toContain("a\u0301b");
    });
});
describe(getCodes.name, () => {
    it("1234-1234-1234", () => {
        expect([...getCodes("1234-1234-1234")]).toEqual(["123412341234"]);
    });
});
describe(getLocationPattern.name, () => {
    function matchAll(text: string) {
        return [...text.matchAll(getLocationPattern())].map(
            (m) => [m.index, m[0]] as const
        );
    }
    it("…Location:…", () => {
        expect(matchAll("Location : ABC, DEF")).toEqual([[11, "ABC, DEF"]]);
        expect(matchAll("Location : 埼玉")).toEqual([[11, "埼玉"]]);
    });
    it("…in …", () => {
        expect(matchAll("I live in ABC, DEF")).toEqual([[10, "ABC, DEF"]]);
        expect(matchAll("I live in 埼玉")).toEqual([[10, "埼玉"]]);
    });
    it("…from …", () => {
        expect(matchAll("I come from ABC, DEF")).toEqual([[12, "ABC, DEF"]]);
        expect(matchAll("I come from : ABC, DEF")).toEqual([[14, "ABC, DEF"]]);
        expect(matchAll("I come from 埼玉")).toEqual([[12, "埼玉"]]);
    });
});
