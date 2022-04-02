/* eslint "@typescript-eslint/no-unused-vars": ["warn", { "varsIgnorePattern": "stream|remaining|^_" }] */
/* eslint-disable @typescript-eslint/ban-types */
// spell-checker: ignore ZWNJ
import { assert, eq, kind, not } from "./type-utils";

type stringHeadOrEmpty<s extends string> = s extends `${infer head}${string}`
    ? head
    : "";

type unreachable = never;
interface DiagnosticKind {
    message: string;
}
type GroupTypeKind = string | undefined;
type GroupsKind = Record<string, GroupTypeKind>;
export interface ExpressionSummaryKind {
    groups: GroupsKind;
}
interface StreamKind {
    remaining: string;
    result: ExpressionSummaryKind;
    diagnostics: DiagnosticKind[];
    options: ParseOptionsKind;

    locals: StreamLocalKind;
}
interface StreamLocalKind {
    /** パース中のグループ名 */
    parsingGroupName: string;

    /** `…(` でグループに入るときに親 result を待避（最後に追加）し、グループから出るとき result を復帰する */
    ancestorResults: ExpressionSummaryKind[];
    /** `…(…)` の後 `true` になり、量指定子またはグループの終わりで `false` に戻す */
    isGroupQualifierExpected: boolean;
}
type initialLocals = kind<
    StreamLocalKind,
    {
        parsingGroupName: "";
        ancestorResults: [];
        isGroupQualifierExpected: false;
    }
>;
type initialResult = kind<ExpressionSummaryKind, { groups: {} }>;
type createStream<
    source extends string,
    options extends ParseOptionsKind = DefaultParseOptions
> = kind<
    StreamKind,
    {
        diagnostics: [];
        options: options;
        remaining: source;
        result: initialResult;
        locals: initialLocals;
    }
>;
type appendGroupName<value extends string, stream extends StreamKind> = kind<
    StreamKind,
    {
        locals: {
            parsingGroupName: `${stream["locals"]["parsingGroupName"]}${value}`;
            ancestorResults: stream["locals"]["ancestorResults"];
            isGroupQualifierExpected: stream["locals"]["isGroupQualifierExpected"];
        };
        diagnostics: stream["diagnostics"];
        options: stream["options"];
        remaining: stream["remaining"];
        result: stream["result"];
    }
>;
type appendGroupNameFromHead<stream extends StreamKind> = appendGroupName<
    stringHeadOrEmpty<stream["remaining"]>,
    stream
>;
type addGroup<
    groups extends GroupsKind,
    name extends string,
    value extends GroupTypeKind
> = kind<
    GroupsKind,
    {
        [key in keyof groups | name]: key extends name ? value : groups[key];
    }
>;
type clearParsingGroupName<stream extends StreamKind> = kind<
    StreamKind,
    {
        locals: {
            parsingGroupName: "";
            ancestorResults: stream["locals"]["ancestorResults"];
            isGroupQualifierExpected: stream["locals"]["isGroupQualifierExpected"];
        };
        diagnostics: stream["diagnostics"];
        options: stream["options"];
        remaining: stream["remaining"];
        result: stream["result"];
    }
>;
type setParsingGroupNameToGroups<stream extends StreamKind> = kind<
    StreamKind,
    {
        locals: stream["locals"];
        diagnostics: stream["diagnostics"];
        options: stream["options"];
        remaining: stream["remaining"];
        result: {
            groups: addGroup<
                stream["result"]["groups"],
                stream["locals"]["parsingGroupName"],
                string
            >;
        };
    }
>;
type markGroupQuantifierExpected<stream extends StreamKind> = kind<
    StreamKind,
    {
        locals: {
            isGroupQualifierExpected: true;
            parsingGroupName: stream["locals"]["parsingGroupName"];
            ancestorResults: stream["locals"]["ancestorResults"];
        };
        diagnostics: stream["diagnostics"];
        options: stream["options"];
        remaining: stream["remaining"];
        result: stream["result"];
    }
>;
type overwriteGroups<
    baseGroup extends GroupsKind,
    extendGroup extends GroupsKind
> = kind<
    GroupsKind,
    {
        [key in
            | keyof baseGroup
            | keyof extendGroup]: key extends keyof extendGroup
            ? extendGroup[key]
            : key extends keyof baseGroup
            ? baseGroup[key]
            : unreachable;
    }
>;

type beginGroup<stream extends StreamKind> = kind<
    StreamKind,
    {
        // 子グループのための result を作成
        result: initialResult;
        locals: {
            // 親グループの result を待避
            ancestorResults: [
                ...stream["locals"]["ancestorResults"],
                stream["result"]
            ];

            parsingGroupName: stream["locals"]["parsingGroupName"];
            isGroupQualifierExpected: stream["locals"]["isGroupQualifierExpected"];
        };
        diagnostics: stream["diagnostics"];
        options: stream["options"];
        remaining: stream["remaining"];
    }
>;
type endGroupIfQualifierExpected<stream extends StreamKind> =
    stream["locals"]["isGroupQualifierExpected"] extends true
        ? // 親グループの result を取得
          stream["locals"]["ancestorResults"] extends [
              ...kind<ExpressionSummaryKind[], infer ancestorResults>,
              kind<ExpressionSummaryKind, infer parentResult>
          ]
            ? kind<
                  StreamKind,
                  {
                      // 親グループの result と子グループの result を結合
                      result: {
                          groups: overwriteGroups<
                              parentResult["groups"],
                              stream["result"]["groups"]
                          >;
                      };
                      locals: {
                          // 残りの先祖
                          ancestorResults: ancestorResults;
                          // グループ量指定子の終わり
                          isGroupQualifierExpected: false;

                          parsingGroupName: stream["locals"]["parsingGroupName"];
                      };
                      diagnostics: stream["diagnostics"];
                      options: stream["options"];
                      remaining: stream["remaining"];
                  }
              >
            : unreachable
        : stream;

type startsWith<
    target extends string,
    stream extends StreamKind
> = stream["remaining"] extends `${target}${string}` ? true : false;
type skipStringUnchecked<
    target extends string,
    stream extends StreamKind
> = stream["remaining"] extends `${target}${infer remaining}`
    ? kind<
          StreamKind,
          {
              remaining: remaining;
              diagnostics: stream["diagnostics"];
              options: stream["options"];
              result: stream["result"];
              locals: stream["locals"];
          }
      >
    : unreachable;

type skipManyChars0Core<
    charSet extends string,
    remaining extends string
> = remaining extends `${charSet}${infer remaining}`
    ? skipManyChars0Core<charSet, remaining>
    : remaining;

type skipManyChars0<charSet extends string, stream extends StreamKind> = kind<
    StreamKind,
    {
        remaining: skipManyChars0Core<charSet, stream["remaining"]>;
        diagnostics: stream["diagnostics"];
        options: stream["options"];
        result: stream["result"];
        locals: stream["locals"];
    }
>;

type skipManyChars1<
    charSet extends string,
    messageId extends MessageIdKind,
    stream extends StreamKind
> = startsWith<charSet, stream> extends true
    ? skipManyChars0<hexDigit, stream>
    : report<stream, messageId>;

type trySkipAnyChar<stream extends StreamKind> =
    stream["remaining"] extends `${string}${infer remaining}`
        ? kind<
              StreamKind,
              {
                  remaining: remaining;
                  diagnostics: stream["diagnostics"];
                  options: stream["options"];
                  result: stream["result"];
                  locals: stream["locals"];
              }
          >
        : stream;

type skipAnyCharUnchecked<stream extends StreamKind> = trySkipAnyChar<stream>;

type isEos<stream extends StreamKind> = stream["remaining"] extends ""
    ? true
    : false;

interface ParseOptionsKind {
    errorMessages: Record<keyof DefaultErrorMessages, string>;
}
type MessageIdKind = keyof ParseOptionsKind["errorMessages"];

type report<
    stream extends StreamKind,
    message extends keyof ParseOptionsKind["errorMessages"]
> = kind<
    StreamKind,
    {
        remaining: stream["remaining"];
        result: stream["result"];
        diagnostics: [
            ...stream["diagnostics"],
            { message: stream["options"]["errorMessages"][message] }
        ];
        options: stream["options"];
        locals: stream["locals"];
    }
>;
type parseString<
    target extends string,
    errorMessageId extends MessageIdKind,
    stream extends StreamKind
> = startsWith<target, stream> extends true
    ? skipStringUnchecked<target, stream>
    : report<stream, errorMessageId>;

type syntaxCharacter =
    | "^"
    | "$"
    | "\\"
    | "."
    | "*"
    | "+"
    | "?"
    | "("
    | ")"
    | "["
    | "]"
    | "{"
    | "}"
    | "|";

/**
 * PatternCharacter :: SourceCharacter but not SyntaxCharacter
 */
type isPatternCharacter<stream extends StreamKind> = startsWith<
    syntaxCharacter,
    stream
> extends true
    ? false
    : not<isEos<stream>>;

type nonZeroDigit = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type decimalDigit = "0" | nonZeroDigit;
type hexDigit =
    | decimalDigit
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F";
type characterClassEscapeSymbol = "d" | "D" | "s" | "S" | "w" | "W";
type characterClassEscapeStart = characterClassEscapeSymbol | "p" | "P";
type controlEscape = "f" | "n" | "r" | "t" | "v";
type hexEscapeSequenceStart = "x";
type regExpUnicodeEscapeSequenceStart = "u";

type skipDecimalDigits0<stream extends StreamKind> = skipManyChars0<
    decimalDigit,
    stream
>;
type skipDecimalDigits1<stream extends StreamKind> = skipManyChars1<
    decimalDigit,
    "need_numbers",
    stream
>;

type isDecimalEscapeStart<stream extends StreamKind> = startsWith<
    nonZeroDigit,
    stream
>;
/**
 * DecimalEscape ::
 * | NonZeroDigit DecimalDigits[~Sep]opt [lookahead ∉ DecimalDigit]
 */
type parseDecimalEscape<stream extends StreamKind> = skipDecimalDigits0<
    skipAnyCharUnchecked<stream>
>;

type asciiLowerLetter =
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "g"
    | "h"
    | "i"
    | "j"
    | "k"
    | "l"
    | "m"
    | "n"
    | "o"
    | "p"
    | "q"
    | "r"
    | "s"
    | "t"
    | "u"
    | "v"
    | "w"
    | "x"
    | "y"
    | "z";

type controlLetter = asciiLowerLetter | Uppercase<asciiLowerLetter>;
type unicodePropertyNameCharacter = controlLetter | "_";

type unicodePropertyNameOrValueCharacter =
    | unicodePropertyNameCharacter
    | decimalDigit
    | "=";

// TODO:
type parseUnicodePropertyValueExpression<stream extends StreamKind> =
    skipManyChars0<unicodePropertyNameOrValueCharacter, stream>;

type isCharacterClassEscapeStart<stream extends StreamKind> = startsWith<
    characterClassEscapeStart,
    stream
>;
/**
 * CharacterClassEscape[UnicodeMode] ::
 * | `d` | `D` | `s` | `S` | `w` | `W`
 * | [+UnicodeMode] `p{` UnicodePropertyValueExpression `}`
 * | [+UnicodeMode] `P{` UnicodePropertyValueExpression `}`
 */
type parseCharacterClassEscape<stream extends StreamKind> = startsWith<
    characterClassEscapeSymbol,
    stream
> extends true
    ? skipAnyCharUnchecked<stream>
    : // p か P
    skipAnyCharUnchecked<stream> extends kind<StreamKind, infer stream>
    ? startsWith<"{", stream> extends true
        ? parseUnicodePropertyValueExpression<
              skipAnyCharUnchecked<stream>
          > extends kind<StreamKind, infer stream>
            ? parseString<
                  "}",
                  "unicode_property_expressions_must_end_with_'}'",
                  stream
              >
            : unreachable
        : // (p か P) の次に { が来なかった
          report<stream, "unicode_property_expressions_must_start_with_'{'">
    : unreachable;

type parseControlLetter<stream extends StreamKind> = parseString<
    controlLetter,
    "'\\c' must_be_followed_by_a_letter_a_to_z_or_A_to_Z_representing_a_control_character",
    stream
>;

type isHex4Digits<stream extends StreamKind> =
    stream["remaining"] extends `${hexDigit}${infer remaining}`
        ? remaining extends `${hexDigit}${infer remaining}`
            ? remaining extends `${hexDigit}${infer remaining}`
                ? remaining extends `${hexDigit}${string}`
                    ? true
                    : false
                : false
            : false
        : false;

type parseCodePoint<stream extends StreamKind> = skipManyChars1<
    hexDigit,
    "hex_escape_sequence_must_have_at_least_one_hex_digit",
    stream
>;

type hexEscapeSequence = `x${hexDigit}${hexDigit}`;
type parseHexEscapeSequence<stream extends StreamKind> = startsWith<
    hexEscapeSequence,
    stream
> extends true
    ? skipAnyCharUnchecked<skipAnyCharUnchecked<skipAnyCharUnchecked<stream>>>
    : report<stream, "must_have_a_two_digit_hexadecimal_number_after_the_x">;

// TODO:
/**
 * RegExpUnicodeEscapeSequence[UnicodeMode] ::
 * | [+UnicodeMode] `u` HexLeadSurrogate `\u` HexTrailSurrogate
 * | [+UnicodeMode] `u` HexLeadSurrogate
 * | [+UnicodeMode] `u` HexTrailSurrogate
 * | [+UnicodeMode] `u` HexNonSurrogate
 * | [~UnicodeMode] `u` Hex4Digits
 * | [+UnicodeMode] `u{` CodePoint `}`
 */
type parseRegExpUnicodeEscapeSequence<stream extends StreamKind> = startsWith<
    "u",
    stream
> extends true
    ? skipAnyCharUnchecked<stream> extends kind<StreamKind, infer stream>
        ? startsWith<"{", stream> extends true
            ? parseCodePoint<skipAnyCharUnchecked<stream>> extends kind<
                  StreamKind,
                  infer stream
              >
                ? parseString<
                      "}",
                      "a_'}'_is_required_after_the_code_point",
                      stream
                  >
                : unreachable
            : isHex4Digits<stream> extends true
            ? skipAnyCharUnchecked<
                  skipAnyCharUnchecked<
                      skipAnyCharUnchecked<skipAnyCharUnchecked<stream>>
                  >
              >
            : report<
                  stream,
                  "must_have_a_four_digit_hexadecimal_number_after_the_u"
              >
        : unreachable
    : unreachable;

// TODO:
/**
 * IdentityEscape[UnicodeMode] ::
 * | [+UnicodeMode]SyntaxCharacter
 * | [+UnicodeMode]`/`
 * | [~UnicodeMode]SourceCharacter but not UnicodeIDContinue
 */
type parseIdentityEscape<stream extends StreamKind> = isEos<stream> extends true
    ? skipAnyCharUnchecked<stream>
    : report<stream, "identity_escape_must_be_followed_by_a_single_character">;

type characterEscapeStart =
    | controlEscape
    | "c"
    | "0"
    | hexEscapeSequenceStart
    | regExpUnicodeEscapeSequenceStart;

type isCharacterEscapeStart<stream extends StreamKind> = startsWith<
    characterEscapeStart,
    stream
>;
/**
 * CharacterEscape[UnicodeMode] ::
 * | ControlEscape
 * | `c` ControlLetter
 * | `0` [lookahead ∉ DecimalDigit]
 * | HexEscapeSequence
 * | RegExpUnicodeEscapeSequence[?UnicodeMode]
 * | IdentityEscape[?UnicodeMode]
 */
type parseCharacterEscape<stream extends StreamKind> = startsWith<
    controlEscape,
    stream
> extends true
    ? skipAnyCharUnchecked<stream>
    : startsWith<"c", stream> extends true
    ? parseControlLetter<skipAnyCharUnchecked<stream>>
    : startsWith<"0", stream> extends true
    ? skipAnyCharUnchecked<stream>
    : startsWith<hexEscapeSequenceStart, stream> extends true
    ? parseHexEscapeSequence<stream>
    : startsWith<regExpUnicodeEscapeSequenceStart, stream> extends true
    ? parseRegExpUnicodeEscapeSequence<stream>
    : parseIdentityEscape<stream>;

// TODO:
/**
 * IdentifierStartChar ::
 * | UnicodeIDStart
 * | `$`
 * | `_`
 */
type identifierStartChar = controlLetter | "$" | "_";
// TODO:
/**
 * IdentifierPartChar ::
 * | UnicodeIDContinue
 * | `$`
 * | <ZWNJ>
 * | <ZWJ>
 */
type identifierPartChar =
    | identifierStartChar
    | decimalDigit
    | "\u200c"
    | "\u200d";

/**
 * RegExpIdentifierStart[UnicodeMode] ::
 * | IdentifierStartChar
 * | `\\` RegExpUnicodeEscapeSequence[+UnicodeMode]
 * | [~UnicodeMode] UnicodeLeadSurrogate UnicodeTrailSurrogate
 */
type parseRegExpIdentifierStart<stream extends StreamKind> = startsWith<
    identifierStartChar,
    stream
> extends true
    ? skipAnyCharUnchecked<appendGroupNameFromHead<stream>>
    : startsWith<"\\", stream> extends true
    ? parseRegExpUnicodeEscapeSequence<skipAnyCharUnchecked<stream>>
    : report<stream, "group_name_is_required">;

/**
 * RegExpIdentifierStart[UnicodeMode] ::
 * | IdentifierStartChar
 * | `\` RegExpUnicodeEscapeSequence[+UnicodeMode]
 * | [~UnicodeMode] UnicodeLeadSurrogate UnicodeTrailSurrogate
 */
type parseRegExpIdentifierParts0<stream extends StreamKind> = startsWith<
    identifierPartChar,
    stream
> extends true
    ? parseRegExpIdentifierParts0<
          skipAnyCharUnchecked<appendGroupNameFromHead<stream>>
      >
    : startsWith<"\\", stream> extends true
    ? parseRegExpIdentifierParts0<
          parseRegExpUnicodeEscapeSequence<skipAnyCharUnchecked<stream>>
      >
    : stream;

/**
 * RegExpIdentifierName[UnicodeMode] ::
 * | RegExpIdentifierStart[?UnicodeMode]
 * | RegExpIdentifierName[?UnicodeMode] RegExpIdentifierPart[?UnicodeMode]
 */
type parseRegExpIdentifierName<stream extends StreamKind> =
    parseRegExpIdentifierParts0<parseRegExpIdentifierStart<stream>>;

/**
 * GroupName[UnicodeMode] :: `<` RegExpIdentifierName[?UnicodeMode] `>`
 * 戻り値は parsingGroupName に入る
 */
type parseGroupName<stream extends StreamKind> = parseRegExpIdentifierName<
    parseString<
        "<",
        "group_name_must_be_followed_by_a_'<'",
        clearParsingGroupName<stream>
    >
> extends kind<StreamKind, infer stream>
    ? parseString<">", "a_'>'_is_required_after_the_group_name", stream>
    : unreachable;

type isAtomEscapeStart<stream extends StreamKind> = not<isEos<stream>>;
/**
 * AtomEscape[UnicodeMode, N] ::
 * | DecimalEscape
 * | CharacterClassEscape[?UnicodeMode]
 * | CharacterEscape[?UnicodeMode]
 * | [+N] `k` GroupName[?UnicodeMode]
 */
type parseAtomEscape<stream extends StreamKind> =
    isDecimalEscapeStart<stream> extends true
        ? parseDecimalEscape<stream>
        : isCharacterClassEscapeStart<stream> extends true
        ? parseCharacterClassEscape<stream>
        : isCharacterEscapeStart<stream> extends true
        ? parseCharacterEscape<stream>
        : startsWith<"k", stream> extends true
        ? parseGroupName<skipStringUnchecked<"k", stream>>
        : unreachable;

type classEscapeSymbol = "b" | "-";
type parseClassEscape<stream extends StreamKind> = startsWith<
    classEscapeSymbol,
    stream
> extends true
    ? skipAnyCharUnchecked<stream>
    : isCharacterClassEscapeStart<stream> extends true
    ? parseCharacterClassEscape<stream>
    : isCharacterEscapeStart<stream> extends true
    ? parseCharacterEscape<stream>
    : report<stream, "character_class_escapes_are_required">;

// TODO:
/**
 * ClassRanges[UnicodeMode] ::
 * | [empty]
 * | NonemptyClassRanges[?UnicodeMode]
 */
type parseClassRanges0<stream extends StreamKind> = startsWith<
    "]",
    stream
> extends true
    ? stream
    : startsWith<"\\", stream> extends true
    ? parseClassEscape<skipAnyCharUnchecked<stream>>
    : isEos<stream> extends true
    ? stream
    : parseClassRanges0<skipAnyCharUnchecked<stream>>;

type isCharacterClassStart<stream extends StreamKind> = startsWith<"[", stream>;
/**
 * CharacterClass[UnicodeMode] ::
 * | `[` [lookahead ≠ `^`] ClassRanges[?UnicodeMode] `]`
 * | `[^` ClassRanges[?UnicodeMode] `]`
 */
type parseCharacterClass<stream extends StreamKind> =
    skipAnyCharUnchecked<stream> extends kind<StreamKind, infer stream>
        ? parseString<
              "]",
              "character_classes_must_end_with_']'",
              parseClassRanges0<
                  startsWith<"^", stream> extends true
                      ? skipAnyCharUnchecked<stream>
                      : stream
              >
          >
        : unreachable;

type parseGroupHead<stream extends StreamKind> = startsWith<
    "?:",
    stream
> extends true
    ? // (?:
      skipStringUnchecked<"?:", stream>
    : startsWith<"?", stream> extends true
    ? // (?<…>
      setParsingGroupNameToGroups<parseGroupName<skipAnyCharUnchecked<stream>>>
    : stream;

type parseGroup<stream extends StreamKind> = parseGroupHead<
    parseString<
        "(",
        "'('_is_required",
        // ここでグループに入る
        beginGroup<stream>
    >
> extends kind<StreamKind, infer stream>
    ? // ここではグループを出ずに、量指定子があるならその後でグループを出る
      markGroupQuantifierExpected<
          parseString<")", "groups_must_end_with_')'", parseDisjunction<stream>>
      >
    : unreachable;

type atomStarts = "\\" | "." | "[" | "(";
type isAtomStart<stream extends StreamKind> = startsWith<
    atomStarts,
    stream
> extends true
    ? true
    : isPatternCharacter<stream>;
/**
 * Atom[U, N] ::
 * | PatternCharacter
 * | `.`
 * | `\\` AtomEscape[?U, ?N]
 * | CharacterClass[?U]
 * | `(` GroupSpecifier[?U] Disjunction[?U, ?N] `)`
 * | `(?:` Disjunction[?U, ?N] `)`
 * // | `(?` RegularExpressionFlags `:` Disjunction[?U, ?N] `)`
 * // | `(?` RegularExpressionFlags `-` RegularExpressionFlags `:` Disjunction[?U, ?N] `)`
 * // | `(?-` RegularExpressionFlags `:` Disjunction[?U, ?N] `)`
 */
type parseAtom<stream extends StreamKind> =
    isPatternCharacter<stream> extends true
        ? skipAnyCharUnchecked<stream>
        : startsWith<".", stream> extends true
        ? skipAnyCharUnchecked<stream>
        : startsWith<"\\", stream> extends true
        ? skipAnyCharUnchecked<stream> extends kind<StreamKind, infer stream>
            ? isAtomEscapeStart<stream> extends true
                ? parseAtomEscape<stream>
                : // "\" の次に AtomEscape が無い場合
                  report<stream, "AtomEscape_is_required">
            : unreachable
        : isCharacterClassStart<stream> extends true
        ? parseCharacterClass<stream>
        : parseGroup<stream>;

type assertionSymbols = "^" | "$" | "\\b" | "\\B";
type assertionGroupStarts = `(?=` | `(?!` | `(?<=` | `(?<!`;
type isAssertionStart<stream extends StreamKind> = startsWith<
    assertionSymbols | assertionGroupStarts,
    stream
>;
/**
 * Assertion[U, N] ::
 * | `^` | `$` | `\\b` | `\\B`
 * | `(?=` Disjunction[?U, ?N] `)`
 * | `(?!` Disjunction[?U, ?N] `)`
 * | `(?<=` Disjunction[?U, ?N] `)`
 * | `(?<!` Disjunction[?U, ?N] `)`
 */
type parseAssertion<stream extends StreamKind> = startsWith<
    assertionSymbols,
    stream
> extends true
    ? skipStringUnchecked<assertionSymbols, stream>
    : startsWith<assertionGroupStarts, stream> extends true
    ? parseDisjunction<
          skipStringUnchecked<assertionGroupStarts, stream>
      > extends kind<StreamKind, infer stream>
        ? parseString<")", "groups_must_end_with_')'", stream>
        : unreachable
    : unreachable;

type quantifierPrefixSymbol = "*" | "+" | "?";
type quantifierPrefixStart = quantifierPrefixSymbol | "{";
type parseQuantifierPrefix<stream extends StreamKind> = startsWith<
    quantifierPrefixSymbol,
    stream
> extends true
    ? skipAnyCharUnchecked<stream>
    : // {
    skipAnyCharUnchecked<stream> extends kind<StreamKind, infer stream>
    ? // { DecimalDigits
      skipDecimalDigits1<stream> extends kind<StreamKind, infer stream>
        ? startsWith<",", stream> extends true
            ? // { DecimalDigits ,
              skipAnyCharUnchecked<stream> extends kind<
                  StreamKind,
                  infer stream
              >
                ? startsWith<"}", stream> extends true
                    ? // { DecimalDigits , }
                      stream
                    : // { DecimalDigits , DecimalDigits }
                      parseString<
                          "}",
                          "'}'_is_required",
                          skipDecimalDigits1<stream>
                      >
                : unreachable
            : // { DecimalDigits }
              parseString<"}", "'}'_is_required", stream>
        : unreachable
    : unreachable;

type quantifierStart = quantifierPrefixStart;
type isQuantifierStart<stream extends StreamKind> = startsWith<
    quantifierStart,
    stream
>;
/**
 * Quantifier ::
 * | QuantifierPrefix
 * | QuantifierPrefix `?`
 */
type parseQuantifier<stream extends StreamKind> =
    parseQuantifierPrefix<stream> extends kind<StreamKind, infer stream>
        ? startsWith<"?", stream> extends true
            ? skipAnyCharUnchecked<stream>
            : stream
        : unreachable;

type isTermStart<stream extends StreamKind> =
    isAssertionStart<stream> extends true ? true : isAtomStart<stream>;
/**
 * Term[U, N] ::
 * | Assertion[?U, ?N]
 * | Atom[?U, ?N]
 * | Atom[?U, ?N] Quantifier
 */
type parseTerm<stream extends StreamKind> =
    isAssertionStart<stream> extends true
        ? parseAssertion<stream>
        : parseAtom<stream> extends kind<StreamKind, infer stream>
        ? isQuantifierStart<stream> extends true
            ? // ここで Atom がグループならグループを終わす
              endGroupIfQualifierExpected<parseQuantifier<stream>>
            : endGroupIfQualifierExpected<stream>
        : unreachable;

/**
 * Alternative[U, N] ::
 * | [empty]
 * | Alternative[?U, ?N] Term[?U, ?N]
 */
type parseAlternative<stream extends StreamKind> =
    isTermStart<stream> extends true
        ? parseTerm<stream> extends kind<StreamKind, infer stream>
            ? parseAlternative<stream>
            : unreachable
        : stream;

/**
 * Disjunction[U, N] ::
 * | Alternative[?U, ?N]
 * | Alternative[?U, ?N] `|` Disjunction[?U, ?N]
 */
type parseDisjunction<stream extends StreamKind> =
    parseAlternative<stream> extends kind<StreamKind, infer stream>
        ? startsWith<"|", stream> extends true
            ? parseDisjunction<skipAnyCharUnchecked<stream>>
            : stream
        : unreachable;
/**
 * Pattern[U, N] :: Disjunction[?U, ?N]
 */
type parsePattern<stream extends StreamKind> = parseDisjunction<stream>;

type parseToEnd<stream extends StreamKind> = parsePattern<stream> extends kind<
    StreamKind,
    infer stream
>
    ? isEos<stream> extends true
        ? stream
        : report<stream, "end_of_source_is_required">
    : unreachable;

interface DefaultErrorMessages {
    end_of_source_is_required: "正規表現の終わりが必要です";
    "groups_must_end_with_')'": "グループの終わりには ')' が必要です";
    AtomEscape_is_required: "'\\' の後には s・w・p{…} などの文字クラス、u… 形式の Unicode エスケープ、k<…> 形式の前方参照などが必要です";
    "unicode_property_expressions_must_end_with_'}'": "Unicode プロパティ式の終わりには '}' が必要です";
    "unicode_property_expressions_must_start_with_'{'": "Unicode プロパティ式の先頭には '{' が必要です";
    "'\\c' must_be_followed_by_a_letter_a_to_z_or_A_to_Z_representing_a_control_character": "'\\c' の後には、制御文字を表す半角英字 ( a-z, A-Z ) が必要です";
    must_have_a_two_digit_hexadecimal_number_after_the_x: "'\\x' の後には 2 桁の 16 進数が必要です";
    hex_escape_sequence_must_have_at_least_one_hex_digit: "コードポイントを表す 16 進数の数値が必要です";
    "a_'}'_is_required_after_the_code_point": "コードポイントの後には '}' が必要です";
    must_have_a_four_digit_hexadecimal_number_after_the_u: "'\\u' の後には 4 桁の 16 進数または { } で囲まれた16進数が必要です";
    identity_escape_must_be_followed_by_a_single_character: "'\\' の後には何か文字が必要です";
    "group_name_must_be_followed_by_a_'<'": "グループ名の前には '<' が必要です";
    "a_'>'_is_required_after_the_group_name": "グループ名の後には '>' が必要です";
    group_name_is_required: "グループ名が必要です";
    "'}'_is_required": "'}' が必要です";
    need_numbers: "数値が必要です";
    "'('_is_required": "'(' が必要です";
    "character_classes_must_end_with_']'": "文字クラスの終わりには ']' が必要です";
    character_class_escapes_are_required: "'\\' の後には d, s, w などの文字クラス、n, r, b などの制御文字、または - も有効です。";
}
type DefaultParseOptions = kind<
    ParseOptionsKind,
    {
        errorMessages: DefaultErrorMessages;
    }
>;

export type ParseRegExpResultKind =
    | [true, ExpressionSummaryKind]
    | [false, DiagnosticKind[]];

export type ParseRegExp<
    pattern extends string,
    options extends ParseOptionsKind = DefaultParseOptions
> = kind<
    ParseRegExpResultKind,
    parseToEnd<createStream<pattern, options>> extends kind<
        StreamKind,
        infer stream
    >
        ? stream["diagnostics"] extends []
            ? [true, stream["result"]]
            : [false, stream["diagnostics"]]
        : unreachable
>;

{
    type parse<pattern extends string> = ParseRegExp<pattern> extends kind<
        [true, ExpressionSummaryKind] | [false, DiagnosticKind[]],
        infer result
    >
        ? result[1]
        : unreachable;

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
