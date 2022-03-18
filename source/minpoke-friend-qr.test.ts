import { getHeuristicLocationTexts, main } from "./minpoke-friend-qr";

describe("main", () => {
    it("main が定義されている", () => {
        expect(main).toBeDefined();
    });
});
describe("getHeuristicLocationTexts", () => {
    it("部分文字列の取得", () => {
        const getTexts = (x: string) => [...getHeuristicLocationTexts(x)];
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
