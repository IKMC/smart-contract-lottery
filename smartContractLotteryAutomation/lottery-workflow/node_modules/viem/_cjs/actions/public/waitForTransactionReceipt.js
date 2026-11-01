"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForTransactionReceipt = waitForTransactionReceipt;
const block_js_1 = require("../../errors/block.js");
const rpc_js_1 = require("../../errors/rpc.js");
const transaction_js_1 = require("../../errors/transaction.js");
const isAddressEqual_js_1 = require("../../utils/address/isAddressEqual.js");
const getAction_js_1 = require("../../utils/getAction.js");
const observe_js_1 = require("../../utils/observe.js");
const withResolvers_js_1 = require("../../utils/promise/withResolvers.js");
const withRetry_js_1 = require("../../utils/promise/withRetry.js");
const stringify_js_1 = require("../../utils/stringify.js");
const getBlock_js_1 = require("./getBlock.js");
const getTransaction_js_1 = require("./getTransaction.js");
const getTransactionReceipt_js_1 = require("./getTransactionReceipt.js");
const watchBlockNumber_js_1 = require("./watchBlockNumber.js");
async function waitForTransactionReceipt(client, parameters) {
    const { checkReplacement = client.chain?.supportsTransactionReplacementDetection ??
        true, confirmations = 1, hash, onReplaced, retryCount = 6, retryDelay = ({ count }) => ~~(1 << count) * 200, timeout = 180_000, } = parameters;
    const replacement = client.chain?.transactionReplacement?.getKey
        ? undefined
        : parameters.replacement;
    const getReplacementKey = (transaction) => client.chain?.transactionReplacement?.getKey?.(transaction) ??
        String(transaction.nonce);
    const pollingInterval = (() => {
        if (parameters.pollingInterval)
            return parameters.pollingInterval;
        if (client.chain?.experimental_preconfirmationTime)
            return client.chain.experimental_preconfirmationTime;
        return client.pollingInterval;
    })();
    const observerId = (0, stringify_js_1.stringify)([
        'waitForTransactionReceipt',
        client.uid,
        hash,
        {
            checkReplacement,
            confirmations,
            pollingInterval,
            replacement,
            retryCount,
            timeout,
        },
    ]);
    let transaction;
    let receipt;
    let replacementResponse;
    let retrying = false;
    let _unobserve;
    let _unwatch;
    const { promise, resolve, reject } = (0, withResolvers_js_1.withResolvers)();
    const timer = timeout
        ? setTimeout(() => {
            _unwatch?.();
            _unobserve?.();
            reject(new transaction_js_1.WaitForTransactionReceiptTimeoutError({ hash }));
        }, timeout)
        : undefined;
    _unobserve = (0, observe_js_1.observe)(observerId, { onReplaced, resolve, reject }, async (emit) => {
        receipt = await (0, getAction_js_1.getAction)(client, getTransactionReceipt_js_1.getTransactionReceipt, 'getTransactionReceipt')({ hash }).catch(() => undefined);
        if (receipt && confirmations <= 1) {
            clearTimeout(timer);
            emit.resolve(receipt);
            _unobserve?.();
            return;
        }
        _unwatch = (0, getAction_js_1.getAction)(client, watchBlockNumber_js_1.watchBlockNumber, 'watchBlockNumber')({
            emitMissed: true,
            emitOnBegin: true,
            poll: true,
            pollingInterval,
            async onBlockNumber(blockNumber_) {
                const done = (fn) => {
                    clearTimeout(timer);
                    _unwatch?.();
                    fn();
                    _unobserve?.();
                };
                let blockNumber = blockNumber_;
                if (retrying)
                    return;
                try {
                    if (receipt) {
                        if (confirmations > 1 &&
                            (!receipt.blockNumber ||
                                blockNumber - receipt.blockNumber + 1n < confirmations))
                            return;
                        done(() => {
                            if (replacementResponse)
                                emit.onReplaced?.(replacementResponse);
                            emit.resolve(receipt);
                        });
                        return;
                    }
                    if (checkReplacement && !transaction) {
                        retrying = true;
                        await (0, withRetry_js_1.withRetry)(async () => {
                            transaction = (await (0, getAction_js_1.getAction)(client, getTransaction_js_1.getTransaction, 'getTransaction')({ hash }));
                            if (transaction.blockNumber)
                                blockNumber = transaction.blockNumber;
                        }, {
                            delay: retryDelay,
                            retryCount,
                            shouldRetry: ({ error }) => !(replacement && error instanceof transaction_js_1.TransactionNotFoundError),
                        });
                        retrying = false;
                    }
                    receipt = await (0, getAction_js_1.getAction)(client, getTransactionReceipt_js_1.getTransactionReceipt, 'getTransactionReceipt')({ hash });
                    if (confirmations > 1 &&
                        (!receipt.blockNumber ||
                            blockNumber - receipt.blockNumber + 1n < confirmations))
                        return;
                    done(() => emit.resolve(receipt));
                }
                catch (err) {
                    if (err instanceof transaction_js_1.TransactionNotFoundError ||
                        err instanceof transaction_js_1.TransactionReceiptNotFoundError) {
                        retrying = false;
                        const replaced = transaction ??
                            (checkReplacement && replacement
                                ? {
                                    ...replacement,
                                    hash: hash.toLowerCase(),
                                }
                                : undefined);
                        if (!replaced)
                            return;
                        if (replaced.blockNumber)
                            return;
                        try {
                            if (!transaction) {
                                retrying = true;
                                const found = (await (0, getAction_js_1.getAction)(client, getTransaction_js_1.getTransaction, 'getTransaction')({
                                    nonce: replaced.nonce,
                                    sender: replaced.from,
                                }).catch((error) => {
                                    if (error instanceof rpc_js_1.MethodNotFoundRpcError ||
                                        error instanceof rpc_js_1.MethodNotSupportedRpcError)
                                        transaction = replaced;
                                    return undefined;
                                }));
                                retrying = false;
                                if (found?.hash.toLowerCase() ===
                                    replaced.hash) {
                                    transaction = found;
                                    return;
                                }
                                if (found) {
                                    const replacementReceipt = await (0, getAction_js_1.getAction)(client, getTransactionReceipt_js_1.getTransactionReceipt, 'getTransactionReceipt')({ hash: found.hash }).catch((error) => {
                                        if (error instanceof transaction_js_1.TransactionReceiptNotFoundError)
                                            return undefined;
                                        throw error;
                                    });
                                    if (!replacementReceipt)
                                        return;
                                    receipt = replacementReceipt;
                                    replacementResponse = {
                                        reason: client.chain?.transactionReplacement?.getReason?.({
                                            replaced,
                                            replacement: found,
                                        }) ??
                                            getReplacementReason(replaced, found),
                                        replacedTransaction: replaced,
                                        transaction: found,
                                        transactionReceipt: receipt,
                                    };
                                    if (confirmations > 1 &&
                                        (!receipt.blockNumber ||
                                            blockNumber - receipt.blockNumber + 1n < confirmations))
                                        return;
                                    done(() => {
                                        emit.onReplaced?.(replacementResponse);
                                        emit.resolve(receipt);
                                    });
                                    return;
                                }
                            }
                            retrying = true;
                            const block = await (0, withRetry_js_1.withRetry)(() => (0, getAction_js_1.getAction)(client, getBlock_js_1.getBlock, 'getBlock')({
                                blockNumber,
                                includeTransactions: true,
                            }), {
                                delay: retryDelay,
                                retryCount,
                                shouldRetry: ({ error }) => error instanceof block_js_1.BlockNotFoundError,
                            });
                            retrying = false;
                            const replacedKey = getReplacementKey(replaced);
                            const replacementTransaction = block.transactions.find((candidate) => (0, isAddressEqual_js_1.isAddressEqual)(candidate.from, replaced.from) &&
                                candidate.hash !== replaced.hash &&
                                getReplacementKey(candidate) === replacedKey);
                            if (!replacementTransaction)
                                return;
                            receipt = await (0, getAction_js_1.getAction)(client, getTransactionReceipt_js_1.getTransactionReceipt, 'getTransactionReceipt')({
                                hash: replacementTransaction.hash,
                            });
                            replacementResponse = {
                                reason: client.chain?.transactionReplacement?.getReason?.({
                                    replaced,
                                    replacement: replacementTransaction,
                                }) ??
                                    getReplacementReason(replaced, replacementTransaction),
                                replacedTransaction: replaced,
                                transaction: replacementTransaction,
                                transactionReceipt: receipt,
                            };
                            if (confirmations > 1 &&
                                (!receipt.blockNumber ||
                                    blockNumber - receipt.blockNumber + 1n < confirmations))
                                return;
                            done(() => {
                                emit.onReplaced?.(replacementResponse);
                                emit.resolve(receipt);
                            });
                        }
                        catch (err_) {
                            done(() => emit.reject(err_));
                        }
                    }
                    else {
                        done(() => emit.reject(err));
                    }
                }
            },
        });
    });
    return promise.finally(() => {
        clearTimeout(timer);
        _unobserve?.();
    });
}
function getReplacementReason(replaced, replacement) {
    if ((replacement.to && replaced.to
        ? (0, isAddressEqual_js_1.isAddressEqual)(replacement.to, replaced.to)
        : replacement.to === replaced.to) &&
        replacement.value === replaced.value &&
        replacement.input === replaced.input)
        return 'repriced';
    if (replacement.from === replacement.to && replacement.value === 0n)
        return 'cancelled';
    return 'replaced';
}
//# sourceMappingURL=waitForTransactionReceipt.js.map