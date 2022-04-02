import type {
    DiagnosticKind,
    ExpressionSummaryKind,
    GroupsKind,
    ParseRegExp,
} from "./type-level-regexp-parser";
import { assert, eq, kind } from "./type-utils";

{
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

    {
        assert<eq<parse<"a">, summary>>();
    }
    {
        type r = parse<"(a)">;
        assert<eq<r, summary>>();
    }
    {
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
    }
}
