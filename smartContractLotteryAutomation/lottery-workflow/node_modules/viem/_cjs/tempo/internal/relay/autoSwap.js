"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const ox_1 = require("ox");
const formatUnits_js_1 = require("../../../utils/unit/formatUnits.js");
const Actions = require("../../actions/index.js");
const ExecutionError = require("../../ExecutionError.js");
const error_js_1 = require("./error.js");
const feeToken_js_1 = require("./feeToken.js");
function create(options) {
    const slippage = options.slippage ?? 0.05;
    if (!Number.isFinite(slippage) || slippage < 0 || slippage > 1)
        throw new RangeError('Expected `slippage` between 0 and 1.');
    return {
        async handleRequest(context, next) {
            if (context.request.method !== 'eth_fillTransaction')
                return next();
            try {
                await next();
            }
            catch (error) {
                const parameters = context.request.params[0];
                const requested = parseRequest(parameters.capabilities);
                if (requested === undefined)
                    throw error;
                const deficit = parseDeficit(error);
                const from = parameters.from;
                if (!deficit || !from)
                    throw error;
                const slippage_request = Math.min(slippage, requested.slippage ?? slippage);
                const ppm = BigInt(Math.floor(slippage_request * 1_000_000));
                const maxAmountIn = deficit.amount + (deficit.amount * ppm) / 1000000n;
                const tokenIn = await selectTokenIn(context, {
                    account: from,
                    amountOut: deficit.amount,
                    exclude: deficit.token,
                    feeToken: parameters.feeToken,
                    maxAmountIn,
                });
                if (!tokenIn)
                    throw error;
                const buy = Actions.dex.buy.call({
                    amountOut: deficit.amount,
                    maxAmountIn,
                    tokenIn,
                    tokenOut: deficit.token,
                });
                const swap = [{ data: buy.data, to: buy.to, value: '0x0' }];
                const { calls: _, data: __, to: ___, value: ____, ...rest } = parameters;
                const calls = [...swap, ...getCalls(parameters)];
                const result = (await context.client
                    .request({
                    method: 'eth_fillTransaction',
                    params: [{ ...rest, calls }],
                })
                    .catch(() => {
                    throw error;
                }));
                const tx = result.tx;
                const capability = {
                    calls: swap.map(({ data, to }) => ({ data, to })),
                    maxIn: { token: tokenIn, value: ox_1.Hex.fromNumber(maxAmountIn) },
                    minOut: {
                        token: deficit.token,
                        value: ox_1.Hex.fromNumber(deficit.amount),
                    },
                    slippage: slippage_request,
                };
                return {
                    ...result,
                    capabilities: { ...result.capabilities, autoSwap: capability },
                    tx: Array.isArray(tx.calls) && tx.calls.length > 0
                        ? tx
                        : { ...tx, calls },
                };
            }
        },
        async afterFill(filled, context) {
            const capability = filled.capabilities?.autoSwap;
            if (!capability)
                return undefined;
            const store = context.getStore(options.store);
            const [metadata_in, metadata_out] = await Promise.all([capability.maxIn.token, capability.minOut.token].map((token) => (0, feeToken_js_1.resolveTokenMetadata)(context.client, { store, token }).catch(() => undefined)));
            if (!metadata_in || !metadata_out)
                return { capabilities: { autoSwap: undefined } };
            return {
                capabilities: {
                    autoSwap: {
                        calls: capability.calls,
                        maxIn: describe(capability.maxIn, metadata_in),
                        minOut: describe(capability.minOut, metadata_out),
                        slippage: capability.slippage,
                    },
                },
            };
        },
    };
}
function parseRequest(capabilities) {
    const value = capabilities?.autoSwap;
    if (value === true)
        return {};
    if (!value || typeof value !== 'object')
        return undefined;
    const { slippage } = value;
    if (slippage === undefined)
        return {};
    if (typeof slippage !== 'number' ||
        !Number.isFinite(slippage) ||
        slippage < 0 ||
        slippage > 1)
        throw new ox_1.RpcResponse.InvalidParamsError({
            message: 'Expected `capabilities.autoSwap.slippage` between 0 and 1.',
        });
    return { slippage };
}
function parseDeficit(error) {
    if (!(0, error_js_1.isExecutionError)(error))
        return undefined;
    const revert = ExecutionError.from(error);
    if (revert.errorName !== 'InsufficientBalance' || revert.args?.length !== 3)
        return undefined;
    const [available, required, token] = revert.args;
    if (required <= available)
        return undefined;
    return { amount: required - available, token };
}
async function selectTokenIn(context, options) {
    const { account, amountOut, exclude, feeToken, maxAmountIn } = options;
    const [preference, tokens] = await Promise.all([
        Actions.fee
            .getUserToken(context.client, { account })
            .then((token) => token?.address)
            .catch(() => undefined),
        context.resolveTokens(),
    ]);
    const preferred = [feeToken, preference].flatMap((token) => token ? [token.toLowerCase()] : []);
    const candidates = [
        ...new Set([
            ...preferred,
            ...tokens.map((token) => token.toLowerCase()),
        ]),
    ]
        .filter((token) => token !== exclude.toLowerCase())
        .slice(0, 100);
    const balances = await Promise.all(candidates.map(async (token) => ({
        balance: await Actions.token
            .getBalance(context.client, { account, token })
            .then(({ amount }) => amount)
            .catch(() => 0n),
        token,
    })));
    const rank = (token) => {
        const index = preferred.indexOf(token);
        return index === -1 ? preferred.length : index;
    };
    const funded = balances
        .filter(({ balance }) => balance > 0n)
        .sort((a, b) => {
        if (rank(a.token) !== rank(b.token))
            return rank(a.token) - rank(b.token);
        return a.balance === b.balance ? 0 : a.balance > b.balance ? -1 : 1;
    });
    const quotes = await Promise.all(funded.map(({ token }) => Actions.dex
        .getBuyQuote(context.client, {
        amountOut,
        tokenIn: token,
        tokenOut: exclude,
    })
        .catch(() => undefined)));
    return funded.find(({ balance }, index) => {
        const quote = quotes[index];
        return quote !== undefined && quote <= maxAmountIn && balance >= quote;
    })?.token;
}
function getCalls(parameters) {
    if (Array.isArray(parameters.calls))
        return parameters.calls;
    const { data, to, value } = parameters;
    if (to === undefined && data === undefined && value === undefined)
        return [];
    return [
        {
            ...(to !== undefined ? { to } : {}),
            ...(data !== undefined ? { data } : {}),
            ...(value !== undefined ? { value } : {}),
        },
    ];
}
function describe(amount, metadata) {
    return {
        decimals: metadata.decimals,
        formatted: (0, formatUnits_js_1.formatUnits)(ox_1.Hex.toBigInt(amount.value), metadata.decimals),
        name: metadata.name,
        symbol: metadata.symbol,
        token: amount.token,
        value: amount.value,
    };
}
//# sourceMappingURL=autoSwap.js.map