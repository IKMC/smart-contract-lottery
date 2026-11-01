"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchEvent = watchEvent;
const abi_js_1 = require("../../errors/abi.js");
const base_js_1 = require("../../errors/base.js");
const request_js_1 = require("../../errors/request.js");
const rpc_js_1 = require("../../errors/rpc.js");
const decodeEventLog_js_1 = require("../../utils/abi/decodeEventLog.js");
const encodeEventTopics_js_1 = require("../../utils/abi/encodeEventTopics.js");
const log_js_1 = require("../../utils/formatters/log.js");
const getAction_js_1 = require("../../utils/getAction.js");
const observe_js_1 = require("../../utils/observe.js");
const poll_js_1 = require("../../utils/poll.js");
const stringify_js_1 = require("../../utils/stringify.js");
const createEventFilter_js_1 = require("./createEventFilter.js");
const getBlockNumber_js_1 = require("./getBlockNumber.js");
const getFilterChanges_js_1 = require("./getFilterChanges.js");
const getLogs_js_1 = require("./getLogs.js");
const uninstallFilter_js_1 = require("./uninstallFilter.js");
function watchEvent(client, { address, args, batch = true, event, events, fromBlock, onError, onLogs, poll: poll_, pollingInterval = client.pollingInterval, strict: strict_, }) {
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
    const strict = strict_ ?? false;
    const pollEvent = () => {
        const observerId = (0, stringify_js_1.stringify)([
            'watchEvent',
            address,
            args,
            batch,
            client.uid,
            event,
            events,
            pollingInterval,
            strict,
            fromBlock,
        ]);
        return (0, observe_js_1.observe)(observerId, { onLogs, onError }, (emit) => {
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
            const getLogsInRange = (from, to) => (0, getAction_js_1.getAction)(client, getLogs_js_1.getLogs, 'getLogs')({
                address,
                args,
                event: event,
                events,
                fromBlock: from,
                strict,
                toBlock: to,
            });
            const unwatch = (0, poll_js_1.poll)(async () => {
                if (!initialized) {
                    try {
                        filter = (await (0, getAction_js_1.getAction)(client, createEventFilter_js_1.createEventFilter, 'createEventFilter')({
                            address,
                            args,
                            event: event,
                            events,
                            strict,
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
                        const logs = await (0, getAction_js_1.getAction)(client, getFilterChanges_js_1.getFilterChanges, 'getFilterChanges')({ filter });
                        emitLogs(logs);
                        return;
                    }
                    const blockNumber = await (0, getAction_js_1.getAction)(client, getBlockNumber_js_1.getBlockNumber, 'getBlockNumber')({});
                    previousBlockNumber ??= blockNumber;
                    let size = blockNumber - previousBlockNumber;
                    while (previousBlockNumber < blockNumber) {
                        const from = previousBlockNumber + 1n;
                        const end = previousBlockNumber + size;
                        const to = end < blockNumber ? end : blockNumber;
                        const logs = await getLogsInRange(from, to).catch((error) => {
                            if (from === to || !isRangeError(error))
                                throw error;
                        });
                        if (!active)
                            return;
                        if (!logs) {
                            size = (to - from + 1n) / 2n;
                            continue;
                        }
                        previousBlockNumber = to;
                        emitLogs(logs);
                    }
                }
                catch (err) {
                    if (filter && err instanceof rpc_js_1.InvalidInputRpcError)
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
                    await (0, getAction_js_1.getAction)(client, uninstallFilter_js_1.uninstallFilter, 'uninstallFilter')({ filter });
                unwatch();
            };
        });
    };
    const subscribeEvent = () => {
        let active = true;
        let unsubscribe = () => (active = false);
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
                const events_ = events ?? (event ? [event] : undefined);
                let topics = [];
                if (events_) {
                    const encoded = events_.flatMap((event) => (0, encodeEventTopics_js_1.encodeEventTopics)({
                        abi: [event],
                        eventName: event.name,
                        args,
                    }));
                    topics = [encoded];
                    if (event)
                        topics = topics[0];
                }
                const { unsubscribe: unsubscribe_ } = await transport.subscribe({
                    params: ['logs', { address, topics }],
                    onData(data) {
                        if (!active)
                            return;
                        const log = data.result;
                        try {
                            const { eventName, args } = (0, decodeEventLog_js_1.decodeEventLog)({
                                abi: events_ ?? [],
                                data: log.data,
                                topics: log.topics,
                                strict,
                            });
                            const formatted = (0, log_js_1.formatLog)(log, { args, eventName });
                            onLogs([formatted]);
                        }
                        catch (err) {
                            let eventName;
                            let isUnnamed;
                            if (err instanceof abi_js_1.DecodeLogDataMismatch ||
                                err instanceof abi_js_1.DecodeLogTopicsMismatch) {
                                if (strict_)
                                    return;
                                eventName = err.abiItem.name;
                                isUnnamed = err.abiItem.inputs?.some((x) => !('name' in x && x.name));
                            }
                            const formatted = (0, log_js_1.formatLog)(log, {
                                args: isUnnamed ? [] : {},
                                eventName,
                            });
                            onLogs([formatted]);
                        }
                    },
                    onError(error) {
                        onError?.(error);
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
    };
    return enablePolling ? pollEvent() : subscribeEvent();
}
function isRangeError(error) {
    if (!(error instanceof base_js_1.BaseError))
        return true;
    const cause = error.walk((err) => err instanceof request_js_1.HttpRequestError || err instanceof request_js_1.RpcRequestError);
    if (!cause)
        return true;
    if (cause instanceof request_js_1.RpcRequestError && cause.code === 429)
        return false;
    if (cause instanceof request_js_1.HttpRequestError && cause.status === undefined)
        return false;
    return cause.status !== 401 && cause.status !== 403 && cause.status !== 429;
}
//# sourceMappingURL=watchEvent.js.map