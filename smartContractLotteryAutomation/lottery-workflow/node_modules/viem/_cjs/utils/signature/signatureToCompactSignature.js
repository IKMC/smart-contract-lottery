"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signatureToCompactSignature = signatureToCompactSignature;
const pad_js_1 = require("../data/pad.js");
const toBytes_js_1 = require("../encoding/toBytes.js");
const toHex_js_1 = require("../encoding/toHex.js");
function signatureToCompactSignature(signature) {
    const { r, s, v, yParity } = signature;
    const yParity_ = (() => {
        if (yParity === 0 || yParity === 1)
            return yParity;
        if (v === 0n || v === 1n)
            return Number(v);
        if (v && (v === 27n || v === 28n || v >= 35n))
            return v % 2n === 0n ? 1 : 0;
        throw new Error('Invalid `v` or `yParity` value');
    })();
    const bytes = (0, toBytes_js_1.hexToBytes)((0, pad_js_1.pad)(s));
    if (bytes[0] & 0x80)
        throw new Error('Invalid `s` value');
    if (yParity_ === 1)
        bytes[0] |= 0x80;
    return { r: (0, pad_js_1.pad)(r), yParityAndS: (0, toHex_js_1.bytesToHex)(bytes) };
}
//# sourceMappingURL=signatureToCompactSignature.js.map