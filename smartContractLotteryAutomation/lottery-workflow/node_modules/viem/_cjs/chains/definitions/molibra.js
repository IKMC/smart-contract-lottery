"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.molibra = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.molibra = (0, defineChain_js_1.defineChain)({
    id: 20226,
    name: 'Molibra',
    nativeCurrency: { name: 'Molibra', symbol: 'MOLI', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://molibra.org'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Moliscan',
            url: 'https://molibra.org/molibra/moliscan',
        },
    },
});
//# sourceMappingURL=molibra.js.map