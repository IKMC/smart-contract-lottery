"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MalformedResponseError = exports.HttpError = void 0;
exports.fromHttp = fromHttp;
const Errors = require("./Errors.js");
const errors_js_1 = require("./internal/errors.js");
const promise = require("./internal/promise.js");
const internal = require("./internal/rpcTransport.js");
function fromHttp(url, options = {}) {
    return internal.create({
        async request(body_, options_) {
            const { fetchFn = options.fetchFn ?? fetch, fetchOptions: fetchOptions_ = options.fetchOptions, timeout = options.timeout ?? 10_000, } = options_;
            const body = JSON.stringify(body_);
            const fetchOptions = typeof fetchOptions_ === 'function'
                ? await fetchOptions_(body_)
                : fetchOptions_;
            const { data, response } = await promise.withTimeout(async ({ signal }) => {
                const signals = [
                    fetchOptions?.signal,
                    timeout > 0 ? signal : null,
                ].filter((s) => Boolean(s));
                const init = {
                    ...fetchOptions,
                    body,
                    headers: {
                        'Content-Type': 'application/json',
                        ...fetchOptions?.headers,
                    },
                    method: fetchOptions?.method ?? 'POST',
                    signal: (() => {
                        if (signals.length < 2)
                            return signals[0] ?? null;
                        if (typeof AbortSignal.any !== 'function')
                            return signals[0];
                        return AbortSignal.any(signals);
                    })(),
                };
                const request = new Request(url, init);
                const response = await fetchFn(request);
                const data = await (async () => {
                    if (response.headers
                        .get('Content-Type')
                        ?.startsWith('application/json'))
                        return response.json();
                    return response.text().then((data) => {
                        try {
                            return JSON.parse(data || '{}');
                        }
                        catch (_err) {
                            if (response.ok)
                                throw new MalformedResponseError({
                                    response: data,
                                });
                            return { error: data };
                        }
                    });
                })();
                return { data, response };
            }, {
                timeout,
                signal: true,
            });
            if (!response.ok)
                throw new HttpError({
                    body,
                    details: JSON.stringify(data.error) ?? response.statusText,
                    response,
                    url,
                });
            return data;
        },
    }, { raw: options.raw });
}
class HttpError extends Errors.BaseError {
    constructor({ body, details, response, url, }) {
        super('HTTP request failed.', {
            details,
            metaMessages: [
                `Status: ${response.status}`,
                `URL: ${(0, errors_js_1.getUrl)(url)}`,
                body ? `Body: ${JSON.stringify(body)}` : undefined,
            ],
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'RpcTransport.HttpError'
        });
    }
}
exports.HttpError = HttpError;
class MalformedResponseError extends Errors.BaseError {
    constructor({ response }) {
        super('HTTP Response could not be parsed as JSON.', {
            metaMessages: [`Response: ${response}`],
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'RpcTransport.MalformedResponseError'
        });
    }
}
exports.MalformedResponseError = MalformedResponseError;
//# sourceMappingURL=RpcTransport.js.map