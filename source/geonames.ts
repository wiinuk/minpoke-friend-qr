// spell-checker: ignore geonames
import { array, enumNumbers, number, or, record, string } from "./json-spec";

interface RequestOptions {
    signal?: AbortSignal;
}
type RequiredSearchParameters =
    | { q: string }
    | {
          name: string;
          /**
           * 検索ワードの曖昧さを指定する。0 から 1 までの数値。
           * `name` パラメーターのみ有効
           * @default 1
           */
          fuzzy?: number;
      }
    | { name_equals: string };

interface CommonOptionalSearchParameters {
    /**
     * ISO-639 2文字言語コード。現在英語 ( en ) とブルガリア語 ( bg ) のみ利用できる。
     * @example en, es, zh, zh-Hant…
     * @default en
     */
    lang?: string;
    /**
     * 最大行数。最大値は 1000。
     * @default 100
     */
    maxRows?: number;
    username?: string;
}
type SearchParameters = RequiredSearchParameters &
    CommonOptionalSearchParameters;

enum ErrorCode {
    Authorization_Exception = 10,
    record_does_not_exist = 11,
    other_error = 12,
    database_timeout = 13,
    invalid_parameter = 14,
    no_result_found = 15,
    duplicate_exception = 16,
    postal_code_not_found = 17,
    daily_limit_of_credits_exceeded = 18,
    hourly_limit_of_credits_exceeded = 19,
    weekly_limit_of_credits_exceeded = 20,
    invalid_input = 21,
    server_overloaded_exception = 22,
    service_not_implemented = 23,
    radius_too_large = 24,
    maxRows_too_large = 27,
}
const ErrorCodeS = enumNumbers(ErrorCode);
const ErrorResponseS = record({
    status: record({
        message: string,
        value: ErrorCodeS,
    }),
});
const GeoNameS = record({
    /** @example 2643743 */
    geonameId: number,

    /** @example "London", "New London", "Norwich" */
    name: string,
    /** @example "London", "New London", "Norwich" */
    toponymName: string,

    /** @example "51.50853" */
    lat: string,
    /** @example "-0.12574" */
    lng: string,

    /** @example "ENG", "08", "CT" */
    adminCode1: string,
    adminCodes1: record({
        /** @example "ENG", "ON", "EC" */
        ISO3166_2: string,
    }),
    /** @example "England", "Ontario", "Eastern Cape" */
    adminName1: string,

    /** @example "2635167" */
    countryId: string,
    /** @example "GB", "ZA", "US" */
    countryCode: string,
    /** @example "United Kingdom", "Canada", "South Africa" */
    countryName: string,

    /** @example "L", "P" */
    fcl: string,
    /** @example "city, village,...", "parks,area, ..." */
    fclName: string,

    /** @example "RGN", "PPL" */
    fcode: string,
    /** @example "region", "capital of a political entity", "populated place", "seat of a second-order administrative division" */
    fcodeName: string,

    /** @example 8961989 */
    population: number,
});
const SearchSuccessResponseS = record({
    totalResultsCount: number,
    geonames: array(GeoNameS),
});
const SearchResultS = or(SearchSuccessResponseS, ErrorResponseS);
const searchResultSpec: typeof SearchResultS = SearchResultS;

class ResponseError extends Error {
    constructor(message: string, public code: ErrorCode) {
        super(message);
        this.name = ResponseError.name;
    }
}
class GeonamesClient {
    constructor(private _userName: string) {}
    async search(
        parameters: Readonly<SearchParameters>,
        { signal }: Readonly<RequestOptions> = {}
    ) {
        const params = new URLSearchParams({
            username: this._userName,
            maxRows: String(10),
        });
        for (const k of Object.keys(parameters)) {
            const anyParameters: { [k: string]: unknown } = parameters;
            params.set(k, String(anyParameters[k]));
        }
        params.set("type", "json");

        const response = await fetch(
            `https://secure.geonames.org/search?${params.toString()}`,
            { signal }
        );
        const result = await response.json();
        searchResultSpec.validate(result);

        if ("status" in result) {
            throw new ResponseError(result.status.message, result.status.value);
        }
        return result;
    }
}
export function createClient(userName: string) {
    return new GeonamesClient(userName);
}
