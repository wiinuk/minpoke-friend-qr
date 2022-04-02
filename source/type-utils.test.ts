import { assert, eq, UndefinedToOptional } from "./type-utils";

describe("UndefinedToOptional", () => {
    type a = UndefinedToOptional<{
        a: "a";
        b?: "b";
        c: "c" | undefined;
        d?: "d" | undefined;
    }>;
    type e = {
        a: "a";
        b?: "b";
        c?: "c";
        d?: "d";
    };
    assert<eq<a, e>>();
});
