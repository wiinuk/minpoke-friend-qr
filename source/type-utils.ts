export type kind<k, t extends k> = t;
export type cast<k, t> = t extends k ? t : k;

export type Update<record, key extends string, newValue> = record & {
    [k in key]-?: newValue;
};

export type eq<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
    T
>() => T extends Y ? 1 : 2
    ? true
    : false;

export type not<x extends boolean> = x extends true ? false : true;

export function assert<_condition extends true>() {
    // 型レベルアサーション関数
}
