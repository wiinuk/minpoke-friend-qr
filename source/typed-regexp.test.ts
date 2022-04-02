/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-invalid-regexp */
import { assert, eq, UndefinedToOptional } from "./type-utils";
import { matchAll, RegExpSpecWith, TypedRegExp } from "./typed-regexp";

describe("TypedRegExp", () => {
    it("flags のパース", () => {
        const r = TypedRegExp("a", "u");
        assert<
            eq<
                typeof r,
                TypedRegExp<{
                    pattern: "a";
                    flags: { u: true };
                    groups: UndefinedToOptional<{}>;
                    groupNumberSet: never;
                }>
            >
        >();
        r.toString();
        r.unicode;
    });
    it("同じフラグが含まれるならエラー", () => {
        //@ts-expect-error 実行時は SyntaxError が発生する
        expect(() => TypedRegExp("a", "uiu")).toThrowError(SyntaxError);
    });
});
describe(matchAll.name, () => {
    it("引数の RegExp に g フラグが必要", () => {
        expect(() =>
            // @ts-expect-error 実行時は TypeError が発生する
            matchAll("", TypedRegExp("a"))
        ).toThrowError(TypeError);
        expect(() =>
            // @ts-expect-error 実行時は TypeError が発生する
            matchAll("", TypedRegExp("a", "i"))
        ).toThrowError(TypeError);

        matchAll("", TypedRegExp("a", "g"));
        matchAll("", TypedRegExp("a", "gi"));
    });
    describe("戻り値の groups プロパティ", () => {
        function matchGroup0<TSpec extends RegExpSpecWith<"g">>(
            source: string,
            pattern: TypedRegExp<TSpec>
        ) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return [...matchAll(source, pattern)][0]!.groups;
        }
        it("名前が1つもないなら groups は undefined", () => {
            const groups = matchGroup0("a", TypedRegExp("a", "g"));
            assert<eq<typeof groups, undefined>>();
            expect(groups).toBeUndefined();
        });
        it("必ずマッチするなら string", () => {
            const groups = matchGroup0("a", TypedRegExp("(?<g1>a)", "g"));
            assert<eq<typeof groups, { g1: string }>>();
            expect(groups).toEqual({ g1: "a" });
        });
        describe("マッチするかもしれないなら string | undefined", () => {
            it("(?<g1>a)?", () => {
                const pattern = TypedRegExp("(?<g1>a)?", "g");
                const groups = matchGroup0("a", pattern);
                assert<eq<typeof groups, { g1?: string }>>();
                expect(groups.g1).toEqual("a");
                expect(matchGroup0("", pattern).g1).toBeUndefined();
            });
            it("(?<g1>a)|b", () => {
                const pattern = TypedRegExp("(?<g1>a)|b", "g");
                const groups = matchGroup0("a", pattern);
                assert<eq<typeof groups, { g1?: string }>>();
                expect(groups.g1).toEqual("a");
                expect(matchGroup0("b", pattern).g1).toBeUndefined();
            });
        });
    });
});
