"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidStoreValueError = void 0;
exports.read = read;
exports.write = write;
const Address = require("ox/Address");
const Hash = require("ox/Hash");
const Json = require("ox/Json");
const tempo_1 = require("ox/tempo");
const base_js_1 = require("../../errors/base.js");
const maxStoredValueLength = 65_536;
const zeroCommitment = `0x${'00'.repeat(32)}`;
async function read(store, options) {
    const { address, chainId, commitment } = options;
    const value = await store.getItem(key({ address, chainId, commitment }));
    if (value === null || value === undefined)
        return null;
    const config = deserialize(value);
    assertKey({ address, commitment, config });
    return config;
}
async function write(store, options) {
    const { address, chainId, commitment } = options;
    const config = (() => {
        try {
            return tempo_1.AccountConfig.from(options.config);
        }
        catch (cause) {
            throw new InvalidStoreValueError({ cause });
        }
    })();
    assertKey({ address, commitment, config });
    const value = serialize(config);
    await store.compareAndSet(key({ address, chainId, commitment }), null, value);
    if (commitment.toLowerCase() === zeroCommitment)
        await store.compareAndSet(key({
            address,
            chainId,
            commitment: tempo_1.AccountConfig.getCommitment(config),
        }), null, value);
}
function assertKey(options) {
    const { address, commitment, config } = options;
    if (!Address.validate(address) || !Hash.validate(commitment))
        throw new InvalidStoreValueError();
    if (config.version === 0n) {
        if (!Address.isEqual(tempo_1.AccountConfig.getAddress(config), address))
            throw new InvalidStoreValueError();
        if (commitment.toLowerCase() === zeroCommitment)
            return;
    }
    if (tempo_1.AccountConfig.getCommitment(config).toLowerCase() !==
        commitment.toLowerCase())
        throw new InvalidStoreValueError();
}
function deserialize(value) {
    try {
        if (value.length > maxStoredValueLength)
            throw new InvalidStoreValueError();
        return tempo_1.AccountConfig.fromRpc(Json.parse(value));
    }
    catch (cause) {
        if (cause instanceof InvalidStoreValueError)
            throw cause;
        throw new InvalidStoreValueError({ cause });
    }
}
function key(options) {
    const { address, chainId, commitment } = options;
    return `configurableAccount:config:${chainId}:${address.toLowerCase()}:${commitment.toLowerCase()}`;
}
function serialize(config) {
    try {
        const value = Json.stringify(tempo_1.AccountConfig.toRpc(config));
        if (value.length > maxStoredValueLength)
            throw new InvalidStoreValueError();
        return value;
    }
    catch (cause) {
        if (cause instanceof InvalidStoreValueError)
            throw cause;
        throw new InvalidStoreValueError({ cause });
    }
}
class InvalidStoreValueError extends base_js_1.BaseError {
    constructor(options = {}) {
        super('Stored account config is malformed or mismatched.', {
            cause: options.cause,
            name: 'Accounts.Config.InvalidStoreValueError',
        });
    }
}
exports.InvalidStoreValueError = InvalidStoreValueError;
//# sourceMappingURL=Config.js.map