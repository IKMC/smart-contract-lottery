"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valuechainTestnet = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.valuechainTestnet = (0, defineChain_js_1.defineChain)({
    id: 138_565,
    name: 'ValueChain Testnet',
    blockTime: 2_000,
    nativeCurrency: { name: 'SOSO', symbol: 'SOSO', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://testnet.valuechain.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'ValueChain Testnet Explorer',
            url: 'https://test-scan.valuechain.xyz',
        },
    },
    testnet: true,
});
//# sourceMappingURL=valuechainTestnet.js.map