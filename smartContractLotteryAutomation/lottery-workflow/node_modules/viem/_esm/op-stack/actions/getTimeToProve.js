import { readContract, } from '../../actions/public/readContract.js';
import { portal2Abi } from '../abis.js';
import { L2TimestampRequiredError, } from '../errors/withdrawal.js';
import { isSuperGameType } from '../gameTypes.js';
import { getPortalVersion, } from './getPortalVersion.js';
import { getTimeToNextGame, } from './getTimeToNextGame.js';
import { getTimeToNextL2Output, } from './getTimeToNextL2Output.js';
/**
 * Returns the time until the withdrawal transaction is ready to prove. Used for the [Withdrawal](/op-stack/guides/withdrawals) flow.
 *
 * - Docs: https://viem.sh/op-stack/actions/getTimeToProve
 *
 * @param client - Client to use
 * @param parameters - {@link GetTimeToNextL2OutputParameters}
 * @returns Time until prove step is ready. {@link GetTimeToNextL2OutputReturnType}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { getBlockNumber } from 'viem/actions'
 * import { mainnet, optimism } from 'viem/chains'
 * import { getTimeToProve } from 'viem/op-stack'
 *
 * const publicClientL1 = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const publicClientL2 = createPublicClient({
 *   chain: optimism,
 *   transport: http(),
 * })
 *
 * const receipt = await publicClientL2.getTransactionReceipt({ hash: '0x...' })
 * const { period, seconds, timestamp } = await getTimeToProve(publicClientL1, {
 *   receipt,
 *   targetChain: optimism
 * })
 */
export async function getTimeToProve(client, parameters) {
    const { chain = client.chain, l2Timestamp, receipt, targetChain: targetChain_, } = parameters;
    const targetChain = targetChain_;
    const portalVersion = await getPortalVersion(client, parameters);
    // Legacy
    if (portalVersion.major < 3)
        return getTimeToNextL2Output(client, {
            ...parameters,
            l2BlockNumber: l2Timestamp ?? receipt.blockNumber,
        });
    const portalAddress = (() => {
        if (parameters.portalAddress)
            return parameters.portalAddress;
        if (chain)
            return targetChain.contracts.portal[chain.id].address;
        return Object.values(targetChain.contracts.portal)[0].address;
    })();
    // Super-root games anchor on L2 timestamps instead of L2 block numbers.
    const l2BlockNumber = await (async () => {
        if (typeof l2Timestamp === 'bigint')
            return l2Timestamp;
        const gameType = await readContract(client, {
            abi: portal2Abi,
            address: portalAddress,
            functionName: 'respectedGameType',
        });
        if (!isSuperGameType(gameType))
            return receipt.blockNumber;
        const timestamp = receipt.logs[0]?.blockTimestamp;
        if (typeof timestamp !== 'bigint')
            throw new L2TimestampRequiredError({ gameType });
        return timestamp;
    })();
    return getTimeToNextGame(client, {
        ...parameters,
        l2BlockNumber,
    });
}
//# sourceMappingURL=getTimeToProve.js.map