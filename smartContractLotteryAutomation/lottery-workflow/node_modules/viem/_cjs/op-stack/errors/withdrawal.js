"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.L2TimestampRequiredError = exports.ReceiptContainsNoWithdrawalsError = exports.GameNotFoundError = void 0;
const base_js_1 = require("../../errors/base.js");
class GameNotFoundError extends base_js_1.BaseError {
    constructor() {
        super('Dispute game not found.', { name: 'GameNotFoundError' });
    }
}
exports.GameNotFoundError = GameNotFoundError;
class ReceiptContainsNoWithdrawalsError extends base_js_1.BaseError {
    constructor({ hash }) {
        super(`The provided transaction receipt with hash "${hash}" contains no withdrawals.`, { name: 'ReceiptContainsNoWithdrawalsError' });
    }
}
exports.ReceiptContainsNoWithdrawalsError = ReceiptContainsNoWithdrawalsError;
class L2TimestampRequiredError extends base_js_1.BaseError {
    constructor({ gameType }) {
        super(`Dispute game type ${gameType} anchors on L2 timestamps, so the L2 timestamp of the withdrawal is required.`, {
            metaMessages: [
                'Pass `l2Timestamp`, or a receipt whose logs include `blockTimestamp`.',
            ],
            name: 'L2TimestampRequiredError',
        });
    }
}
exports.L2TimestampRequiredError = L2TimestampRequiredError;
//# sourceMappingURL=withdrawal.js.map