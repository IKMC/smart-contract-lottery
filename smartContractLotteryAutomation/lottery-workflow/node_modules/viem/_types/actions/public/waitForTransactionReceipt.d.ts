import type { Address } from 'abitype';
import type { Client } from '../../clients/createClient.js';
import type { Transport } from '../../clients/transports/createTransport.js';
import { type WaitForTransactionReceiptTimeoutErrorType } from '../../errors/transaction.js';
import type { ErrorType } from '../../errors/utils.js';
import type { Chain } from '../../types/chain.js';
import type { Hash, Hex } from '../../types/misc.js';
import type { Transaction } from '../../types/transaction.js';
import { type ObserveErrorType } from '../../utils/observe.js';
import { type WithRetryParameters } from '../../utils/promise/withRetry.js';
import { type GetBlockErrorType } from './getBlock.js';
import { type GetTransactionErrorType } from './getTransaction.js';
import { type GetTransactionReceiptErrorType, type GetTransactionReceiptReturnType } from './getTransactionReceipt.js';
import { type WatchBlockNumberErrorType } from './watchBlockNumber.js';
export type ReplacementReason = 'cancelled' | 'replaced' | 'repriced';
export type ReplacementReturnType<chain extends Chain | undefined = Chain | undefined> = {
    reason: ReplacementReason;
    replacedTransaction: Transaction;
    transaction: Transaction;
    transactionReceipt: GetTransactionReceiptReturnType<chain>;
};
export type WaitForTransactionReceiptReturnType<chain extends Chain | undefined = Chain | undefined> = GetTransactionReceiptReturnType<chain>;
export type WaitForTransactionReceiptParameters<chain extends Chain | undefined = Chain | undefined> = {
    /**
     * Whether to check for transaction replacements.
     * @default `client.chain?.supportsTransactionReplacementDetection ?? true`
     */
    checkReplacement?: boolean | undefined;
    /**
     * The number of confirmations (blocks that have passed) to wait before resolving.
     * @default 1
     */
    confirmations?: number | undefined;
    /** The hash of the transaction. */
    hash: Hash;
    /** Optional callback to emit if the transaction has been replaced. */
    onReplaced?: ((response: ReplacementReturnType<chain>) => void) | undefined;
    /**
     * Polling frequency (in ms). Defaults to the client's pollingInterval config.
     * @default client.pollingInterval
     */
    pollingInterval?: number | undefined;
    /**
     * The sender and nonce of the transaction, and optionally the fields it was
     * sent with.
     *
     * A node can drop a replaced transaction before the wait first reads it, and
     * `hash` alone does not identify its sender and nonce. With them, the wait
     * looks up the transaction in its nonce slot (`eth_getTransactionBySenderAndNonce`).
     * Without that method, it scans each block from the one it starts on, which
     * misses a replacement mined earlier.
     *
     * `onReplaced` receives these fields, with `hash`, as `replacedTransaction`.
     * Ignored on chains with their own replacement keys (e.g. Tempo nonce lanes),
     * where a sender and nonce do not identify a nonce slot.
     */
    replacement?: {
        /** The sender of the transaction. */
        from: Address;
        /** The calldata of the transaction. Identifies a repriced replacement. */
        input?: Hex | undefined;
        /** The nonce of the transaction. */
        nonce: number;
        /** The recipient of the transaction. Identifies a repriced replacement. */
        to?: Address | null | undefined;
        /** The value of the transaction (in wei). Identifies a repriced replacement. */
        value?: bigint | undefined;
    } | undefined;
    /**
     * Number of times to retry if the transaction or block is not found.
     * @default 6 (exponential backoff)
     */
    retryCount?: WithRetryParameters['retryCount'] | undefined;
    /**
     * Time to wait (in ms) between retries.
     * @default `({ count }) => ~~(1 << count) * 200` (exponential backoff)
     */
    retryDelay?: WithRetryParameters['delay'] | undefined;
    /**
     * Optional timeout (in milliseconds) to wait before stopping polling.
     * @default 180_000
     */
    timeout?: number | undefined;
};
export type WaitForTransactionReceiptErrorType = ObserveErrorType | GetBlockErrorType | GetTransactionErrorType | GetTransactionReceiptErrorType | WatchBlockNumberErrorType | WaitForTransactionReceiptTimeoutErrorType | ErrorType;
/**
 * Waits for the [Transaction](https://viem.sh/docs/glossary/terms#transaction) to be included on a [Block](https://viem.sh/docs/glossary/terms#block) (one confirmation), and then returns the [Transaction Receipt](https://viem.sh/docs/glossary/terms#transaction-receipt).
 *
 * - Docs: https://viem.sh/docs/actions/public/waitForTransactionReceipt
 * - Example: https://stackblitz.com/github/wevm/viem/tree/main/examples/transactions_sending-transactions
 * - JSON-RPC Methods:
 *   - Polls [`eth_getTransactionReceipt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionReceipt) on each block until it has been processed.
 *   - If a Transaction has been replaced:
 *     - Calls [`eth_getBlockByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblockbynumber) and extracts the transactions
 *     - Checks if one of the Transactions is a replacement
 *     - If so, calls [`eth_getTransactionReceipt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionReceipt).
 *   - If the Transaction is not found and `replacement` is provided:
 *     - Calls `eth_getTransactionBySenderAndNonce` to find the Transaction in its nonce slot
 *     - If it is a replacement, calls [`eth_getTransactionReceipt`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getTransactionReceipt).
 *
 * The `waitForTransactionReceipt` action additionally supports Replacement detection (e.g. sped up Transactions).
 *
 * Transactions can be replaced when a user modifies their transaction in their wallet (to speed up or cancel). Transactions are replaced when they are sent from the same nonce.
 *
 * There are 3 types of Transaction Replacement reasons:
 *
 * - `repriced`: The gas price has been modified (e.g. different `maxFeePerGas`)
 * - `cancelled`: The Transaction has been cancelled (e.g. `value === 0n`)
 * - `replaced`: The Transaction has been replaced (e.g. different `value` or `data`)
 *
 * @param client - Client to use
 * @param parameters - {@link WaitForTransactionReceiptParameters}
 * @returns The transaction receipt. {@link WaitForTransactionReceiptReturnType}
 *
 * @example
 * import { createPublicClient, waitForTransactionReceipt, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 *
 * const client = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const transactionReceipt = await waitForTransactionReceipt(client, {
 *   hash: '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d',
 * })
 */
export declare function waitForTransactionReceipt<chain extends Chain | undefined>(client: Client<Transport, chain>, parameters: WaitForTransactionReceiptParameters<chain>): Promise<WaitForTransactionReceiptReturnType<chain>>;
//# sourceMappingURL=waitForTransactionReceipt.d.ts.map