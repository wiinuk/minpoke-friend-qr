export type kind<k, t extends k> = t;
export type cast<k, t> = t extends k ? t : k;
type flatten<T> = {
    [k in keyof T]: T[k];
};

export type Update<record, key extends string, newValue> = record & {
    [k in key]-?: newValue;
};
export type UndefinedToOptional<T> = flatten<
    {
        [k in keyof T as undefined extends T[k] ? never : k]: T[k];
    } & {
        [k in keyof T as undefined extends T[k] ? k : never]?: Exclude<
            T[k],
            undefined
        >;
    }
>;

export type eq<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
    T
>() => T extends Y ? 1 : 2
    ? true
    : false;

export type not<x extends boolean> = x extends true ? false : true;

export function assert<_condition extends true>() {
    // 型レベルアサーション関数
}
