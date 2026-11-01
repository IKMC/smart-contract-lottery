import * as Address from 'ox/Address';
import * as Hash from 'ox/Hash';
import * as Json from 'ox/Json';
import { AccountConfig } from 'ox/tempo';
import { BaseError } from '../../errors/base.js';
/** A valid 48-owner config is much smaller; 64 KiB bounds hostile store parsing work. */
const maxStoredValueLength = 65_536;
/** Zero commitment used before an account is initialized. */
const zeroCommitment = `0x${'00'.repeat(32)}`;
/** Reads a cached account config. */
export async function read(store, options) {
    const { address, chainId, commitment } = options;
    const value = await store.getItem(key({ address, chainId, commitment }));
    if (value === null || value === undefined)
        return null;
    const config = deserialize(value);
    assertKey({ address, commitment, config });
    return config;
}
/**
 * Writes a validated account config.
 *
 * Each key fixes one config, through its commitment or, before initialization, the account
 * address. An existing key therefore holds the same config and is not written again.
 */
export async function write(store, options) {
    const { address, chainId, commitment } = options;
    const config = (() => {
        try {
            return AccountConfig.from(options.config);
        }
        catch (cause) {
            throw new InvalidStoreValueError({ cause });
        }
    })();
    assertKey({ address, commitment, config });
    const value = serialize(config);
    await store.compareAndSet(key({ address, chainId, commitment }), null, value);
    // Initialization commits the version-zero config without changing its version.
    if (commitment.toLowerCase() === zeroCommitment)
        await store.compareAndSet(key({
            address,
            chainId,
            commitment: AccountConfig.getCommitment(config),
        }), null, value);
}
/** Verifies that a config matches its account-and-commitment key. */
function assertKey(options) {
    const { address, commitment, config } = options;
    if (!Address.validate(address) || !Hash.validate(commitment))
        throw new InvalidStoreValueError();
    if (config.version === 0n) {
        if (!Address.isEqual(AccountConfig.getAddress(config), address))
            throw new InvalidStoreValueError();
        if (commitment.toLowerCase() === zeroCommitment)
            return;
    }
    if (AccountConfig.getCommitment(config).toLowerCase() !==
        commitment.toLowerCase())
        throw new InvalidStoreValueError();
}
/** Deserializes an account config from storage. */
function deserialize(value) {
    try {
        if (value.length > maxStoredValueLength)
            throw new InvalidStoreValueError();
        return AccountConfig.fromRpc(Json.parse(value));
    }
    catch (cause) {
        if (cause instanceof InvalidStoreValueError)
            throw cause;
        throw new InvalidStoreValueError({ cause });
    }
}
/** Returns the store key for an account and config commitment on one chain. */
function key(options) {
    const { address, chainId, commitment } = options;
    return `configurableAccount:config:${chainId}:${address.toLowerCase()}:${commitment.toLowerCase()}`;
}
/** Serializes an account config for storage. */
function serialize(config) {
    try {
        const value = Json.stringify(AccountConfig.toRpc(config));
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
/** Thrown when a stored account config is malformed or mismatched. */
export class InvalidStoreValueError extends BaseError {
    /** Creates an invalid store value error. */
    constructor(options = {}) {
        super('Stored account config is malformed or mismatched.', {
            cause: options.cause,
            name: 'Accounts.Config.InvalidStoreValueError',
        });
    }
}
//# sourceMappingURL=Config.js.map