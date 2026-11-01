import * as Errors from './Errors.js';
import { getUrl } from './internal/errors.js';
import * as promise from './internal/promise.js';
import * as internal from './internal/rpcTransport.js';
/**
 * Creates a HTTP JSON-RPC Transport from a URL.
 *
 * @example
 * ```ts twoslash
 * import { RpcTransport } from 'ox'
 *
 * const transport = RpcTransport.fromHttp('https://1.rpc.thirdweb.com')
 *
 * const blockNumber = await transport.request({ method: 'eth_blockNumber' })
 * // @log: '0x1a2b3c'
 * ```
 *
 * @param url - URL to perform the JSON-RPC requests to.
 * @param options - Transport options.
 * @returns HTTP JSON-RPC Transport.
 */
export function fromHttp(url, options = {}) {
    return internal.create({
        async request(body_, options_) {
            const { fetchFn = options.fetchFn ?? fetch, fetchOptions: fetchOptions_ = options.fetchOptions, timeout = options.timeout ?? 10_000, } = options_;
            const body = JSON.stringify(body_);
            const fetchOptions = typeof fetchOptions_ === 'function'
                ? await fetchOptions_(body_)
                : fetchOptions_;
            const { data, response } = await promise.withTimeout(async ({ signal }) => {
                // Abort on whichever signal fires first, so that a caller's
                // `signal` does not disable the timeout.
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
                        // Runtimes without `AbortSignal.any` (e.g. Node < 18.17) keep
                        // only the caller's signal, as before.
                        if (typeof AbortSignal.any !== 'function')
                            return signals[0];
                        return AbortSignal.any(signals);
                    })(),
                };
                const request = new Request(url, init);
                const response = await fetchFn(request);
                // Read the body within the timeout too, so a response that stalls
                // after its headers cannot hang the request.
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
/** Thrown when a HTTP request fails. */
export class HttpError extends Errors.BaseError {
    constructor({ body, details, response, url, }) {
        super('HTTP request failed.', {
            details,
            metaMessages: [
                `Status: ${response.status}`,
                `URL: ${getUrl(url)}`,
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
/** Thrown when a HTTP response is malformed. */
export class MalformedResponseError extends Errors.BaseError {
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
//# sourceMappingURL=RpcTransport.js.map