"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.from = from;
exports.fromRpc = fromRpc;
exports.fromRpcList = fromRpcList;
exports.fromTuple = fromTuple;
exports.fromTupleList = fromTupleList;
exports.getSignPayload = getSignPayload;
exports.hash = hash;
exports.toRpc = toRpc;
exports.toRpcList = toRpcList;
exports.toTuple = toTuple;
exports.toTupleList = toTupleList;
const Hash = require("./Hash.js");
const Hex = require("./Hex.js");
const Rlp = require("./Rlp.js");
const Signature = require("./Signature.js");
function from(authorization, options = {}) {
    if (typeof authorization.chainId === 'string')
        return fromRpc(authorization);
    return { ...authorization, ...options.signature };
}
function fromRpc(authorization) {
    const { address, chainId, nonce } = authorization;
    const signature = Signature.fromRpc(authorization);
    Signature.assert({ r: signature.r, s: signature.s });
    assertYParity(signature.yParity);
    return {
        address,
        chainId: Number(chainId),
        nonce: BigInt(nonce),
        ...signature,
    };
}
function fromRpcList(authorizationList) {
    return authorizationList.map(fromRpc);
}
function fromTuple(tuple) {
    const [chainId, address, nonce, yParity, r, s] = tuple;
    let args = {
        address,
        chainId: chainId === '0x' ? 0 : Number(chainId),
        nonce: nonce === '0x' ? 0n : BigInt(nonce),
    };
    if (yParity && r && s) {
        const signature = {
            r: r === '0x' ? 0n : BigInt(r),
            s: s === '0x' ? 0n : BigInt(s),
            yParity: yParity === '0x' ? 0 : Number(yParity),
        };
        Signature.assert({ r: signature.r, s: signature.s });
        assertYParity(signature.yParity);
        args = { ...args, ...signature };
    }
    return from(args);
}
function fromTupleList(tupleList) {
    const list = [];
    for (const tuple of tupleList)
        list.push(fromTuple(tuple));
    return list;
}
function getSignPayload(authorization) {
    return hash(authorization, { presign: true });
}
function hash(authorization, options = {}) {
    const { presign } = options;
    return Hash.keccak256(Hex.concat('0x05', Rlp.fromHex(toTuple(presign
        ? {
            address: authorization.address,
            chainId: authorization.chainId,
            nonce: authorization.nonce,
        }
        : authorization))));
}
function toRpc(authorization) {
    const { address, chainId, nonce, ...signature } = authorization;
    assertYParity(signature.yParity);
    return {
        address,
        chainId: Hex.fromNumber(chainId),
        nonce: Hex.fromNumber(nonce),
        ...Signature.toRpc(signature),
        yParity: Hex.fromNumber(signature.yParity),
    };
}
function toRpcList(authorizationList) {
    return authorizationList.map(toRpc);
}
function toTuple(authorization) {
    const { address, chainId, nonce, r, s, yParity } = authorization;
    const signature = Signature.extract({ r, s });
    if (signature && typeof yParity !== 'undefined')
        assertYParity(yParity);
    return [
        chainId ? Hex.fromNumber(chainId) : '0x',
        address,
        nonce ? Hex.fromNumber(nonce) : '0x',
        ...(signature
            ? [
                yParity ? Hex.fromNumber(yParity, { size: 1 }) : '0x',
                signature.r === 0n ? '0x' : Hex.trimLeft(Hex.fromNumber(signature.r)),
                signature.s === 0n ? '0x' : Hex.trimLeft(Hex.fromNumber(signature.s)),
            ]
            : []),
    ];
}
function toTupleList(list) {
    if (!list || list.length === 0)
        return [];
    const tupleList = [];
    for (const authorization of list)
        tupleList.push(toTuple(authorization));
    return tupleList;
}
function assertYParity(yParity) {
    if (Number.isInteger(yParity) && yParity >= 0 && yParity < 256)
        return;
    throw new Hex.IntegerOutOfRangeError({
        max: '255',
        min: '0',
        signed: false,
        size: 1,
        value: `${yParity}`,
    });
}
//# sourceMappingURL=Authorization.js.map