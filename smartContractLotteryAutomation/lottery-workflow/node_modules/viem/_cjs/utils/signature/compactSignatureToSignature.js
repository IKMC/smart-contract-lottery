"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactSignatureToSignature = compactSignatureToSignature;
const pad_js_1 = require("../data/pad.js");
const toBytes_js_1 = require("../encoding/toBytes.js");
const toHex_js_1 = require("../encoding/toHex.js");
function compactSignatureToSignature({ r, yParityAndS, }) {
    const yParityAndS_bytes = (0, toBytes_js_1.hexToBytes)((0, pad_js_1.pad)(yParityAndS));
    const yParity = yParityAndS_bytes[0] & 0x80 ? 1 : 0;
    const s = yParityAndS_bytes;
    if (yParity === 1)
        s[0] &= 0x7f;
    return { r: (0, pad_js_1.pad)(r), s: (0, toHex_js_1.bytesToHex)(s), yParity };
}
//# sourceMappingURL=compactSignatureToSignature.js.map