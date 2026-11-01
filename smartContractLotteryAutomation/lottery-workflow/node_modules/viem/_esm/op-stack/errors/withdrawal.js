import { BaseError } from '../../errors/base.js';
export class GameNotFoundError extends BaseError {
    constructor() {
        super('Dispute game not found.', { name: 'GameNotFoundError' });
    }
}
export class ReceiptContainsNoWithdrawalsError extends BaseError {
    constructor({ hash }) {
        super(`The provided transaction receipt with hash "${hash}" contains no withdrawals.`, { name: 'ReceiptContainsNoWithdrawalsError' });
    }
}
export class L2TimestampRequiredError extends BaseError {
    constructor({ gameType }) {
        super(`Dispute game type ${gameType} anchors on L2 timestamps, so the L2 timestamp of the withdrawal is required.`, {
            metaMessages: [
                'Pass `l2Timestamp`, or a receipt whose logs include `blockTimestamp`.',
            ],
            name: 'L2TimestampRequiredError',
        });
    }
}
//# sourceMappingURL=withdrawal.js.map