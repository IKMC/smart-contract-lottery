"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitToProve = waitToProve;
const readContract_js_1 = require("../../actions/public/readContract.js");
const abis_js_1 = require("../abis.js");
const withdrawal_js_1 = require("../errors/withdrawal.js");
const gameTypes_js_1 = require("../gameTypes.js");
const getWithdrawals_js_1 = require("../utils/getWithdrawals.js");
const getPortalVersion_js_1 = require("./getPortalVersion.js");
const waitForNextGame_js_1 = require("./waitForNextGame.js");
const waitForNextL2Output_js_1 = require("./waitForNextL2Output.js");
async function waitToProve(client, parameters) {
    const { chain = client.chain, gameLimit, l2Timestamp, receipt, targetChain: targetChain_, } = parameters;
    const targetChain = targetChain_;
    const [withdrawal] = (0, getWithdrawals_js_1.getWithdrawals)(receipt);
    if (!withdrawal)
        throw new withdrawal_js_1.ReceiptContainsNoWithdrawalsError({
            hash: receipt.transactionHash,
        });
    const portalVersion = await (0, getPortalVersion_js_1.getPortalVersion)(client, parameters);
    if (portalVersion.major < 3) {
        const output = await (0, waitForNextL2Output_js_1.waitForNextL2Output)(client, {
            ...parameters,
            l2BlockNumber: l2Timestamp ?? receipt.blockNumber,
        });
        return {
            game: {
                extraData: '0x',
                index: output.outputIndex,
                l2BlockNumber: output.l2BlockNumber,
                metadata: '0x',
                rootClaim: output.outputRoot,
                timestamp: output.timestamp,
                usesSuperRoots: false,
            },
            output,
            withdrawal,
        };
    }
    const portalAddress = (() => {
        if (parameters.portalAddress)
            return parameters.portalAddress;
        if (chain)
            return targetChain.contracts.portal[chain.id].address;
        return Object.values(targetChain.contracts.portal)[0].address;
    })();
    const l2BlockNumber = await (async () => {
        if (typeof l2Timestamp === 'bigint')
            return l2Timestamp;
        const gameType = await (0, readContract_js_1.readContract)(client, {
            abi: abis_js_1.portal2Abi,
            address: portalAddress,
            functionName: 'respectedGameType',
        });
        if (!(0, gameTypes_js_1.isSuperGameType)(gameType))
            return receipt.blockNumber;
        const timestamp = receipt.logs[0]?.blockTimestamp;
        if (typeof timestamp !== 'bigint')
            throw new withdrawal_js_1.L2TimestampRequiredError({ gameType });
        return timestamp;
    })();
    const game = await (0, waitForNextGame_js_1.waitForNextGame)(client, {
        ...parameters,
        limit: gameLimit,
        l2BlockNumber,
    });
    return {
        game,
        output: {
            l2BlockNumber: game.l2BlockNumber,
            outputIndex: game.index,
            outputRoot: game.rootClaim,
            timestamp: game.timestamp,
        },
        withdrawal,
    };
}
//# sourceMappingURL=waitToProve.js.map