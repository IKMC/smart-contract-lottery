import { DecodeLogDataMismatch, DecodeLogTopicsMismatch, } from '../../errors/abi.js';
import { BaseError } from '../../errors/base.js';
import { HttpRequestError, RpcRequestError } from '../../errors/request.js';
import { InvalidInputRpcError } from '../../errors/rpc.js';
import { decodeEventLog } from '../../utils/abi/decodeEventLog.js';
import { encodeEventTopics, } from '../../utils/abi/encodeEventTopics.js';
import { formatLog } from '../../utils/formatters/log.js';
import { getAction } from '../../utils/getAction.js';
import { observe } from '../../utils/observe.js';
import { poll } from '../../utils/poll.js';
import { stringify } from '../../utils/stringify.js';
import { createContractEventFilter } from './createContractEventFilter.js';
import { getBlockNumber } from './getBlockNumber.js';
import { getContractEvents, } from './getContractEvents.js';
import { getFilterChanges } from './getFilterChanges.js';
import { uninstallFilter } from './uninstallFilter.js';
/**
 * Watches and returns emitted contract event logs.
 *
 * - Docs: https://viem.sh/docs/contract/watchContractEvent
 *
 * This Action will batch up all the event logs found within the [`pollingInterval`](https://viem.sh/docs/contract/watchContractEvent#pollinginterval-optional), and invoke them via [`onLogs`](https://viem.sh/docs/contract/watchContractEvent#onLogs).
 *
 * `watchContractEvent` will attempt to create an [Event Filter](https://viem.sh/docs/contract/createContractEventFilter) and listen to changes to the Filter per polling interval, however, if the RPC Provider does not support Filters (e.g. `eth_newFilter`), then `watchContractEvent` will fall back to using [`getLogs`](https://viem.sh/docs/actions/public/getLogs) instead. If `getLogs` fails for a block range, `watchContractEvent` will retry with smaller block ranges and may call `onLogs` more than once per polling interval.
 *
 * @param client - Client to use
 * @param parameters - {@link WatchContractEventParameters}
 * @returns A function that can be invoked to stop watching for new event logs. {@link WatchContractEventReturnType}
 *
 * @example
 * import { createPublicClient, http, parseAbi } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { watchContractEvent } from 'viem/contract'
 *
 * const client = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const unwatch = watchContractEvent(client, {
 *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
 *   abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']),
 *   eventName: 'Transfer',
 *   args: { from: '0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b' },
 *   onLogs: (logs) => console.log(logs),
 * })
 */
export function watchContractEvent(client, parameters) {
    const { abi, address, args, batch = true, eventName, fromBlock, onError, onLogs, poll: poll_, pollingInterval = client.pollingInterval, strict: strict_, } = parameters;
    const enablePolling = (() => {
        if (typeof poll_ !== 'undefined')
            return poll_;
        if (typeof fromBlock === 'bigint')
            return true;
        if (client.transport.type === 'webSocket' ||
            client.transport.type === 'ipc')
            return false;
        if (client.transport.type === 'fallback' &&
            (client.transport.transports[0].config.type === 'webSocket' ||
                client.transport.transports[0].config.type === 'ipc'))
            return false;
        return true;
    })();
    const pollContractEvent = () => {
        const strict = strict_ ?? false;
        const observerId = stringify([
            'watchContractEvent',
            address,
            args,
            batch,
            client.uid,
            eventName,
            pollingInterval,
            strict,
            fromBlock,
        ]);
        return observe(observerId, { onLogs, onError }, (emit) => {
            let active = true;
            let previousBlockNumber = fromBlock === undefined ? undefined : fromBlock - 1n;
            let filter;
            let initialized = false;
            const emitLogs = (logs) => {
                if (logs.length === 0)
                    return;
                if (batch)
                    emit.onLogs(logs);
                else
                    for (const log of logs)
                        emit.onLogs([log]);
            };
            // Fetches the logs of the blocks from `from` to `to`, inclusive.
            const getLogsInRange = (from, to) => getAction(client, getContractEvents, 'getContractEvents')({
                abi,
                address,
                args,
                eventName,
                fromBlock: from,
                toBlock: to,
                strict,
            });
            const unwatch = poll(async () => {
                if (!initialized) {
                    try {
                        filter = (await getAction(client, createContractEventFilter, 'createContractEventFilter')({
                            abi,
                            address,
                            args: args,
                            eventName: eventName,
                            strict: strict,
                            fromBlock,
                        }));
                    }
                    catch { }
                    initialized = true;
                    if (filter)
                        return;
                }
                try {
                    if (filter) {
                        const logs = await getAction(client, getFilterChanges, 'getFilterChanges')({ filter });
                        emitLogs(logs);
                        return;
                    }
                    // If the filter doesn't exist, we will fall back to use `getLogs`.
                    // The fall back exists because some RPC Providers do not support filters.
                    const blockNumber = await getAction(client, getBlockNumber, 'getBlockNumber')({});
                    // Without `fromBlock`, start watching from the current block.
                    previousBlockNumber ??= blockNumber;
                    // RPC Providers limit `eth_getLogs` by block range, log count or response
                    // size. `size` is the most blocks to request at once: it starts with all
                    // new blocks and halves whenever a request fails.
                    let size = blockNumber - previousBlockNumber;
                    while (previousBlockNumber < blockNumber) {
                        const from = previousBlockNumber + 1n;
                        const end = previousBlockNumber + size;
                        const to = end < blockNumber ? end : blockNumber;
                        const logs = await getLogsInRange(from, to).catch((error) => {
                            // A single block cannot be split, and a smaller range does not
                            // help when the RPC Provider is unreachable or rejects the client.
                            if (from === to || !isRangeError(error))
                                throw error;
                        });
                        if (!active)
                            return;
                        if (!logs) {
                            size = (to - from + 1n) / 2n;
                            continue;
                        }
                        // Only move past blocks whose logs were fetched, so none are skipped.
                        previousBlockNumber = to;
                        emitLogs(logs);
                    }
                }
                catch (err) {
                    // If a filter has been set and gets uninstalled, providers will throw an InvalidInput error.
                    // Reinitialize the filter when this occurs
                    if (filter && err instanceof InvalidInputRpcError)
                        initialized = false;
                    emit.onError?.(err);
                }
            }, {
                emitOnBegin: true,
                interval: pollingInterval,
            });
            return async () => {
                active = false;
                if (filter)
                    await getAction(client, uninstallFilter, 'uninstallFilter')({ filter });
                unwatch();
            };
        });
    };
    const subscribeContractEvent = () => {
        const strict = strict_ ?? false;
        const observerId = stringify([
            'watchContractEvent',
            address,
            args,
            batch,
            client.uid,
            eventName,
            pollingInterval,
            strict,
        ]);
        let active = true;
        let unsubscribe = () => (active = false);
        return observe(observerId, { onLogs, onError }, (emit) => {
            ;
            (async () => {
                try {
                    const transport = (() => {
                        if (client.transport.type === 'fallback') {
                            const transport = client.transport.transports.find((transport) => transport.config.type === 'webSocket' ||
                                transport.config.type === 'ipc');
                            if (!transport)
                                return client.transport;
                            return transport.value;
                        }
                        return client.transport;
                    })();
                    const topics = eventName
                        ? encodeEventTopics({
                            abi: abi,
                            eventName: eventName,
                            args,
                        })
                        : [];
                    const { unsubscribe: unsubscribe_ } = await transport.subscribe({
                        params: ['logs', { address, topics }],
                        onData(data) {
                            if (!active)
                                return;
                            const log = data.result;
                            try {
                                const { eventName, args } = decodeEventLog({
                                    abi: abi,
                                    data: log.data,
                                    topics: log.topics,
                                    strict: strict_,
                                });
                                const formatted = formatLog(log, {
                                    args,
                                    eventName: eventName,
                                });
                                emit.onLogs([formatted]);
                            }
                            catch (err) {
                                let eventName;
                                let isUnnamed;
                                if (err instanceof DecodeLogDataMismatch ||
                                    err instanceof DecodeLogTopicsMismatch) {
                                    // If strict mode is on, and log data/topics do not match event definition, skip.
                                    if (strict_)
                                        return;
                                    eventName = err.abiItem.name;
                                    isUnnamed = err.abiItem.inputs?.some((x) => !('name' in x && x.name));
                                }
                                // Set args to empty if there is an error decoding (e.g. indexed/non-indexed params mismatch).
                                const formatted = formatLog(log, {
                                    args: isUnnamed ? [] : {},
                                    eventName,
                                });
                                emit.onLogs([formatted]);
                            }
                        },
                        onError(error) {
                            emit.onError?.(error);
                        },
                    });
                    unsubscribe = unsubscribe_;
                    if (!active)
                        unsubscribe();
                }
                catch (err) {
                    onError?.(err);
                }
            })();
            return () => unsubscribe();
        });
    };
    return enablePolling ? pollContractEvent() : subscribeContractEvent();
}
/** Returns whether a failed `eth_getLogs` request may succeed with a smaller block range. */
function isRangeError(error) {
    if (!(error instanceof BaseError))
        return true;
    const cause = error.walk((err) => err instanceof HttpRequestError || err instanceof RpcRequestError);
    if (!cause)
        return true;
    // Rate limited.
    if (cause instanceof RpcRequestError && cause.code === 429)
        return false;
    // Unreachable.
    if (cause instanceof HttpRequestError && cause.status === undefined)
        return false;
    // Unauthorized, forbidden or rate limited.
    return cause.status !== 401 && cause.status !== 403 && cause.status !== 429;
}
//# sourceMappingURL=watchContractEvent.js.map