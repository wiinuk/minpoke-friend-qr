type MutableObjectPath = (number | string)[];
const internalPathCache: MutableObjectPath = [];

const enum Precedence {
    /** @example `number | string` */
    Or,
    /** @example `number[]` */
    Array,
    /** @example `number`, `{ k: p }`, `(string | null)` */
    Primary,
}
export abstract class Spec<T> {
    abstract readonly imitation: T;
    /** @internal */
    abstract _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is T;
    /** @internal */
    abstract readonly _internal_typeExpression: string;
    /** @internal */
    abstract readonly _internal_typeExpressionPrecedence: Precedence;
    validate(value: unknown): asserts value is T {
        try {
            this._internal_validateCore(value, internalPathCache);
        } finally {
            internalPathCache.length = 0;
        }
    }
}
function showObject(value: unknown) {
    return JSON.stringify(value) ?? String(value);
}
function showFullObjectPath(path: Readonly<MutableObjectPath>) {
    let result = "$";
    for (const x of path) {
        result += "." + String(x);
    }
    return result;
}

function exprOrWrapRaw(
    expr: string,
    exprPrecedence: Precedence,
    minPrecedence: Precedence
) {
    return exprPrecedence < minPrecedence ? `(${expr})` : expr;
}
function exprOrWrap(s: Spec<unknown>, minPrecedence: Precedence) {
    return exprOrWrapRaw(
        s._internal_typeExpression,
        s._internal_typeExpressionPrecedence,
        minPrecedence
    );
}
function showTypeMismatchMessage(
    expectedType: string,
    typePrecedence: Precedence,
    actualValue: unknown,
    path: Readonly<MutableObjectPath>
) {
    return `Expected ${exprOrWrapRaw(
        expectedType,
        typePrecedence,
        Precedence.Array
    )}. actual: ${showObject(actualValue)}. at: ${showFullObjectPath(path)}`;
}

function showPropertyNotFoundMessage(
    expectedKey: string,
    path: Readonly<MutableObjectPath>
) {
    return `Expected property "${expectedKey}". at: ${showFullObjectPath(
        path
    )}`;
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = ValidationError.name;
    }
}
export const string: Spec<string> = new (class StringSpec extends Spec<string> {
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        if (typeof value !== "string") {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
    override _internal_typeExpression = "string";
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override imitation = "";
})();

export const number: Spec<number> = new (class NumberSpec extends Spec<number> {
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        if (typeof value !== "number") {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
    override _internal_typeExpression = "number";
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override imitation = 0;
})();

export type PropertySpecs<Record> = {
    [K in keyof Record]: Spec<Record[K]>;
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
class RecordSpec<Record extends { [k: string]: unknown }> extends Spec<Record> {
    constructor(private readonly _propertySpecs: PropertySpecs<Record>) {
        super();
    }
    override get imitation() {
        const result: Record = Object.create(null);
        const propertySpecs = this._propertySpecs;
        for (const key in propertySpecs) {
            if (hasOwnProperty.call(propertySpecs, key)) {
                result[key] = propertySpecs[key].imitation;
            }
        }
        return result;
    }
    override get _internal_typeExpression() {
        const propertySpecs = this._propertySpecs;
        const properties = [];
        for (const key in propertySpecs) {
            if (hasOwnProperty.call(propertySpecs, key)) {
                properties.push(
                    `${key}: ${propertySpecs[key]._internal_typeExpression}`
                );
            }
        }
        return `{ ${properties.join(", ")} }`;
    }
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is Record {
        if (typeof value !== "object" || value === null) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
        const propertySpecs = this._propertySpecs;
        for (const key in propertySpecs) {
            if (!(key in value)) {
                throw new ValidationError(
                    showPropertyNotFoundMessage(key, path)
                );
            }
            const x: Spec<unknown> = propertySpecs[key];
            path.push(key);
            x._internal_validateCore(
                (value as { [k: string]: unknown })[key],
                path
            );
            path.pop();
        }
    }
}
export function record<Record extends { [k: string]: unknown }>(
    propertySpecs: PropertySpecs<Record>
): Spec<Record> {
    return new RecordSpec(propertySpecs);
}
class ArraySpec<T> extends Spec<T[]> {
    constructor(private readonly _elementSpec: Spec<T>) {
        super();
    }
    override get imitation() {
        return [];
    }
    override get _internal_typeExpression() {
        return `${exprOrWrap(this._elementSpec, Precedence.Array)}[]`;
    }
    override _internal_typeExpressionPrecedence = Precedence.Array;
    override _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is T[] {
        if (!Array.isArray(value)) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
        const elementSpec: Spec<T> = this._elementSpec;
        for (let i = 0; i < value.length; i++) {
            path.push(i);
            elementSpec._internal_validateCore(value[i], path);
            path.pop();
        }
    }
}
export function array<T>(spec: Spec<T>): Spec<T[]> {
    return new ArraySpec(spec);
}

type SpecImitation<TSpec extends Spec<unknown>> = TSpec extends Spec<infer T>
    ? T
    : never;
type SpecsImitation<TSpecs extends Spec<unknown>[]> = SpecImitation<
    TSpecs[number]
>;

class OrSpec<TSpecs extends [Spec<unknown>, ...Spec<unknown>[]]> extends Spec<
    SpecsImitation<TSpecs>
> {
    constructor(private readonly _specs: TSpecs) {
        super();
    }
    override get _internal_typeExpression() {
        const specs = this._specs;
        if (specs.length === 1) {
            return specs[0]._internal_typeExpression;
        }
        return specs.map((s) => exprOrWrap(s, Precedence.Or)).join(" | ");
    }
    override get _internal_typeExpressionPrecedence() {
        const specs = this._specs;
        return specs.length === 1
            ? specs[0]._internal_typeExpressionPrecedence
            : Precedence.Or;
    }
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        for (const spec of this._specs) {
            try {
                spec._internal_validateCore(value, path);
                return;
            } catch (e) {
                if (e instanceof Error && e.name === ValidationError.name) {
                    continue;
                }
                throw e;
            }
        }
        throw new ValidationError(
            showTypeMismatchMessage(
                this._internal_typeExpression,
                this._internal_typeExpressionPrecedence,
                value,
                path
            )
        );
    }
    override imitation = this._specs[0].imitation as SpecsImitation<TSpecs>;
}
export function or<TSpecs extends [Spec<unknown>, ...Spec<unknown>[]]>(
    ...specs: TSpecs
): Spec<SpecsImitation<TSpecs>> {
    return new OrSpec(specs);
}
export type LiteralKind = undefined | null | boolean | number | string;
class LiteralSpec<T extends LiteralKind> extends Spec<T> {
    constructor(private readonly _value: T) {
        super();
    }
    override imitation = this._value;
    override get _internal_typeExpression() {
        return JSON.stringify(this._value);
    }
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        if (value !== this.imitation) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
}
export function literal<T extends LiteralKind>(value: T): Spec<T> {
    return new LiteralSpec(value);
}
function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
    return 0 < array.length;
}
type Values<T> = T[keyof T];
type EnumNumbersImitation<TEnumParent extends { [name: string]: unknown }> =
    Values<{
        [k in keyof TEnumParent as number extends k
            ? never
            : k]: TEnumParent[k];
    }>;
export function enumNumbers<
    EnumParent extends { [name: string | number]: string | number }
>(parent: EnumParent): Spec<EnumNumbersImitation<EnumParent>> {
    const literalSpecs: Spec<number>[] = [];
    for (const k of Object.keys(parent)) {
        const value = parent[k];
        if (typeof value === "number") {
            literalSpecs.push(literal(value));
        }
    }
    if (!isNonEmpty(literalSpecs)) {
        throw new Error("no enum values");
    }
    return or(...literalSpecs) as Spec<EnumNumbersImitation<EnumParent>>;
}
