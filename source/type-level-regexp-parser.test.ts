/* eslint-disable @typescript-eslint/ban-types */
import type {
    DiagnosticKind,
    ExpressionSummaryKind,
    GroupsKind,
    ParseRegExp,
} from "./type-level-regexp-parser";
import { assert, eq, kind } from "./type-utils";

describe("ParseRegExp", () => {
    type parse<pattern extends string> = ParseRegExp<pattern> extends kind<
        [true, ExpressionSummaryKind] | [false, DiagnosticKind[]],
        infer result
    >
        ? result[1]
        : never;

    // eslint-disable-next-line @typescript-eslint/ban-types
    type summary<groups extends GroupsKind = {}> = kind<
        ExpressionSummaryKind,
        {
            groups: groups;
        }
    >;

    it("a", () => {
        assert<eq<parse<"a">, summary>>();
    });
    it("(a)", () => {
        type r = parse<"(a)">;
        assert<eq<r, summary>>();
    });
    it("(?<a>(?<a1>)(?<a2>))(?<b>(?<b1>)(?<b2>))", () => {
        type r = parse<"(?<a>(?<a1>)(?<a2>))(?<b>(?<b1>)(?<b2>))">;
        assert<
            eq<
                r,
                summary<{
                    a: string;
                    a1: string;
                    a2: string;
                    b: string;
                    b1: string;
                    b2: string;
                }>
            >
        >();
    });
    it("(", () => {
        type r = parse<"(">;
        assert<
            eq<
                r,
                [
                    {
                        consumed: "(";
                        remaining: "";
                        message: "グループの終わりには ')' が必要です";
                    }
                ]
            >
        >();
    });
    it(`.*+`, () => {
        type r = parse<".*+">;
        assert<
            eq<
                r,
                [
                    {
                        consumed: ".*";
                        remaining: "+";
                        message: "量指定子 ( ?、*、{2,3} など ) の左には、終端記号 ( a、\\w、[…]、(…) など ) が必要です";
                    }
                ]
            >
        >();
    });
    it("[\\w_]", () => {
        type r = parse<"[\\w_]">;
        assert<eq<r, summary<{}>>>();
    });
});
