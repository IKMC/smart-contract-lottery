"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeToProve = getTimeToProve;
const readContract_js_1 = require("../../actions/public/readContract.js");
const abis_js_1 = require("../abis.js");
const withdrawal_js_1 = require("../errors/withdrawal.js");
const gameTypes_js_1 = require("../gameTypes.js");
const getPortalVersion_js_1 = require("./getPortalVersion.js");
const getTimeToNextGame_js_1 = require("./getTimeToNextGame.js");
const getTimeToNextL2Output_js_1 = require("./getTimeToNextL2Output.js");
async function getTimeToProve(client, parameters) {
    const { chain = client.chain, l2Timestamp, receipt, targetChain: targetChain_, } = parameters;
    const targetChain = targetChain_;
    const portalVersion = await (0, getPortalVersion_js_1.getPortalVersion)(client, parameters);
    if (portalVersion.major < 3)
        return (0, getTimeToNextL2Output_js_1.getTimeToNextL2Output)(client, {
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
    return (0, getTimeToNextGame_js_1.getTimeToNextGame)(client, {
        ...parameters,
        l2BlockNumber,
    });
}
//# sourceMappingURL=getTimeToProve.js.map