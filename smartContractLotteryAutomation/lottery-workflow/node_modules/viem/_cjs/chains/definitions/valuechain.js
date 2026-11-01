"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valuechain = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.valuechain = (0, defineChain_js_1.defineChain)({
    id: 286_623,
    name: 'ValueChain',
    blockTime: 2_000,
    nativeCurrency: { name: 'SOSO', symbol: 'SOSO', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://mainnet.valuechain.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'ValueChain Explorer',
            url: 'https://main-scan.valuechain.xyz',
        },
    },
});
//# sourceMappingURL=valuechain.js.map