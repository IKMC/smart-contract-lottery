import type { Address } from 'abitype';
import { type TokenId } from 'ox/tempo';
import type { RpcBlock } from '../types/rpc.js';
import type { SerializeTransactionFn } from '../utils/transaction/serializeTransaction.js';
import type { Hardfork } from './Hardfork.js';
import * as Transaction from './Transaction.js';
export declare const chainConfig: {
    readonly blockTime: 1000;
    readonly extendSchema: {
        feeToken?: TokenId.TokenIdOrAddress | undefined;
        hardfork?: Hardfork | undefined;
    };
    readonly formatters: {
        readonly block: {
            readonly format: (block: RpcBlock) => import("../index.js").Block;
            readonly type: "block";
        };
        readonly transaction: {
            readonly format: (transaction: Transaction.TransactionRpc) => Transaction.Transaction<bigint, number, boolean>;
            readonly exclude: never[] | undefined;
            readonly type: "transaction";
        };
        readonly transactionReceipt: {
            exclude: [] | undefined;
            format: (args: Transaction.TransactionReceiptRpc, action?: string | undefined) => Transaction.TransactionReceipt;
            type: "transactionReceipt";
        };
        readonly transactionRequest: {
            exclude: [] | undefined;
            format: (args: Transaction.TransactionRequest, action?: string | undefined) => Transaction.TransactionRequestRpc;
            type: "transactionRequest";
        };
    };
    readonly prepareTransactionRequest: [(r: import("../index.js").PrepareTransactionRequestParameters, { client, phase }: {
        client: import("../index.js").Client;
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("../index.js").PrepareTransactionRequestParameters>, {
        readonly runAt: readonly ["beforeFillTransaction", "afterFillParameters"];
    }];
    readonly serializers: {
        readonly transaction: SerializeTransactionFn;
        readonly transactionEnvelope: ({ serializedTransaction, transaction }: {
            serializedTransaction: import("../index.js").TransactionSerializedGeneric;
            transaction: import("../index.js").TransactionSerializable;
        }) => Promise<`0x${string}`>;
    };
    readonly transactionReplacement: {
        readonly getKey: (transaction: {
            from: Address;
            hash: `0x${string}`;
            nonce: number;
        }) => string;
        readonly getReason: ({ replaced, replacement }: {
            replaced: {
                from: Address;
                hash: `0x${string}`;
                nonce: number;
            };
            replacement: {
                from: Address;
                hash: `0x${string}`;
                nonce: number;
            };
        }) => import("../index.js").ReplacementReason;
    };
    readonly verifyHash: (client: import("../index.js").Client, parameters: import("../actions/public/verifyHash.js").VerifyHashParameters) => Promise<boolean>;
};
export type ChainConfig = typeof chainConfig;
//# sourceMappingURL=chainConfig.d.ts.map