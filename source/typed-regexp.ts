/* eslint-disable @typescript-eslint/ban-types */
import type {
    DiagnosticKind,
    ExpressionSummaryKind,
    ParseRegExp,
    ParseRegExpResultKind,
} from "./type-level-regexp-parser";
import type { cast, kind, Update } from "./type-utils";

type PatternKind = string;
type FlagsSpecKind = Partial<Record<FlagKind, true>>;
export interface RegExpSpec {
    pattern: PatternKind;
    flags: FlagsSpecKind;
    groups: Record<string, string | undefined>;
    groupNumberSet: number;
}
export interface RegExpSpecWith<TFlag extends FlagKind> extends RegExpSpec {
    flags: Update<RegExpSpec["flags"], TFlag, true>;
}

type FlagKind =
    // hasIndices
    | "d"
    // global
    | "g"
    // ignoreCase
    | "i"
    // multiline
    | "m"
    // dotAll
    | "s"
    // unicode
    | "u"
    // sticky
    | "y";

type flatten<T> = {
    [k in keyof T]: T[k];
};

type intersection<a, b> = {} extends a ? b : {} extends b ? a : flatten<a & b>;

export type UndefinedToOptional<T> = intersection<
    {
        [k in keyof T as undefined extends T[k] ? never : k]: T[k];
    },
    {
        [k in keyof T as undefined extends T[k]
            ? T[k] extends undefined
                ? never
                : k
            : never]?: Exclude<T[k], undefined>;
    }
>;

type FlagsKind = string;
type SpecToGroups<TSpec extends RegExpSpec> =
    keyof TSpec["groups"] extends never
        ? undefined
        : cast<Record<string, string>, UndefinedToOptional<TSpec["groups"]>>;

interface TypedRegExpMatchArray<
    TGroups extends Record<string, string> | undefined
> extends RegExpMatchArray {
    groups: TGroups;
}

type HasFlag<
    TSpec extends RegExpSpec,
    TFlag extends FlagKind
> = TSpec["flags"][TFlag] extends true ? true : false;

type GetFlag<
    TSpec extends RegExpSpec,
    TFlag extends FlagKind
> = TSpec["flags"][TFlag] extends true ? TFlag : "";

type Flags<TSpec extends RegExpSpec> = `${GetFlag<TSpec, "d">}${GetFlag<
    TSpec,
    "g"
>}${GetFlag<TSpec, "i">}${GetFlag<TSpec, "m">}${GetFlag<TSpec, "s">}${GetFlag<
    TSpec,
    "u"
>}${GetFlag<TSpec, "y">}`;

type castTo<record, key, t> = cast<
    key extends keyof record ? record[key] : unknown,
    t
>;

export interface TypedRegExp<TSpec extends RegExpSpec> extends RegExp {
    // Object から継承
    toString(): TSpec["pattern"];
    valueOf(): this;

    // --- lib.es5 ---
    // TODO:
    // exec
    lastIndex: HasFlag<TSpec, "g" | "y"> extends true ? number : 0;

    // TODO: "" => "(?:)", "\n" => "\\n"
    readonly source: TSpec["pattern"];

    readonly global: castTo<RegExp, "global", HasFlag<TSpec, "g">>;
    readonly ignoreCase: castTo<RegExp, "ignoreCase", HasFlag<TSpec, "i">>;
    readonly multiline: castTo<RegExp, "multiline", HasFlag<TSpec, "m">>;

    // --- lib.es2015.core ---
    readonly flags: castTo<RegExp, "flags", Flags<TSpec>>;
    readonly sticky: castTo<RegExp, "sticky", HasFlag<TSpec, "y">>;
    readonly unicode: castTo<RegExp, "unicode", HasFlag<TSpec, "u">>;

    // --- lib.es2018.regexp ---
    readonly dotAll: castTo<RegExp, "dotAll", HasFlag<TSpec, "s">>;

    // --- proposal ---
    // EcmaScript: `https://tc39.es/proposal-regexp-match-indices`
    // TypeScript: `https://github.com/microsoft/TypeScript/issues/44227`
    readonly hasIndices: castTo<RegExp, "hasIndices", HasFlag<TSpec, "d">>;
}

type ParseFlags<
    flags extends FlagsKind,
    result extends FlagsSpecKind = {}
> = flags extends `${infer head}${infer tail}`
    ? head extends FlagKind
        ? // 同じフラグが2回以上指定されているならエラーになる
          head extends keyof result
            ? never
            : ParseFlags<tail, Update<result, head, true>>
        : never
    : result;

type ValidateFlags<TFlags extends FlagsKind> = FlagsKind extends TFlags
    ? `ℹ️ 文字列リテラル型を使ってください。`
    : ParseFlags<TFlags> extends never
    ? never
    : TFlags;

type ParseSpec<
    TPattern extends PatternKind,
    TFlags extends FlagsKind
> = ParseRegExp<TPattern> extends infer result extends [
    true,
    ExpressionSummaryKind
]
    ? kind<
          RegExpSpec,
          {
              pattern: TPattern;
              flags: ParseFlags<TFlags>;
              groups: result[1]["groups"];
              // TODO:
              groupNumberSet: never;
          }
      >
    : never;

type stringJoinTail<
    xs extends string[],
    separator extends string,
    result extends string
> = xs extends [infer head extends string, ...infer tail extends string[]]
    ? stringJoinTail<tail, separator, `${result}${separator}${head}`>
    : result;

type stringJoin<xs extends string[], separator extends string> = xs extends [
    infer head extends string,
    ...infer tail extends string[]
]
    ? `${head}${stringJoinTail<tail, separator, "">}`
    : ``;

type showDiagnostic<d extends DiagnosticKind> =
    `${d["consumed"]}👈❰❰❰ℹ️ ${d["message"]}❱❱❱${d["remaining"]}}`;

type buildErrorMessage<TDiagnostics extends DiagnosticKind[]> = stringJoin<
    {
        [k in keyof TDiagnostics]: `/${showDiagnostic<
            cast<DiagnosticKind, TDiagnostics[k]>
        >}/`;
    },
    ", "
>;

type unreachable = never;
type ValidatePattern<TPattern extends PatternKind> =
    PatternKind extends TPattern
        ? `ℹ️ 文字列リテラル型を使ってください。`
        : ParseRegExp<TPattern> extends infer result extends ParseRegExpResultKind
        ? result[0] extends true
            ? TPattern
            : buildErrorMessage<cast<DiagnosticKind[], result[1]>>
        : unreachable;

interface TypedRegExpConstructor {
    new <TPattern extends PatternKind, TFlags extends FlagsKind>(
        pattern: ValidatePattern<TPattern>,
        flags?: ValidateFlags<TFlags>
    ): TypedRegExp<ParseSpec<TPattern, TFlags>>;
    <TPattern extends PatternKind, TFlags extends FlagsKind>(
        pattern: ValidatePattern<TPattern>,
        flags?: ValidateFlags<TFlags>
    ): TypedRegExp<ParseSpec<TPattern, TFlags>>;
}
export const TypedRegExp = RegExp as unknown as TypedRegExpConstructor;

export function matchAll<TSpec extends RegExpSpecWith<"g">>(
    source: string,
    regexp: TypedRegExp<TSpec>
) {
    return source.matchAll(regexp) as IterableIterator<
        TypedRegExpMatchArray<SpecToGroups<TSpec>>
    >;
}
