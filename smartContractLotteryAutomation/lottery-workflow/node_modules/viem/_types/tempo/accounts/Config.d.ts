import * as Address from 'ox/Address';
import type * as Hex from 'ox/Hex';
import { AccountConfig } from 'ox/tempo';
import { BaseError } from '../../errors/base.js';
import type * as Store from '../Store.js';
/** Reads a cached account config. */
export declare function read(store: Store.Store, options: read.Options): Promise<AccountConfig.Config | null>;
export declare namespace read {
    /** Parameters for {@link read}. */
    type Options = {
        /** Configurable account address. */
        address: Address.Address;
        /** Chain whose commitment selects the config. */
        chainId: number;
        /** Config commitment observed onchain. */
        commitment: Hex.Hex;
    };
}
/**
 * Writes a validated account config.
 *
 * Each key fixes one config, through its commitment or, before initialization, the account
 * address. An existing key therefore holds the same config and is not written again.
 */
export declare function write(store: Store.Atomic, options: write.Options): Promise<void>;
export declare namespace write {
    /** Parameters for {@link write}. */
    type Options = {
        /** Configurable account address. */
        address: Address.Address;
        /** Chain whose commitment selects the config. */
        chainId: number;
        /** Config commitment used for lookup. */
        commitment: Hex.Hex;
        /** Complete config. */
        config: AccountConfig.Config;
    };
}
/** Thrown when a stored account config is malformed or mismatched. */
export declare class InvalidStoreValueError extends BaseError {
    /** Creates an invalid store value error. */
    constructor(options?: InvalidStoreValueError.Options);
}
export declare namespace InvalidStoreValueError {
    /** Error construction options. */
    type Options = {
        /** Underlying error. */
        cause?: unknown | undefined;
    };
}
//# sourceMappingURL=Config.d.ts.map