import { toHex } from '../encoding/toHex.js';
import { toYParitySignatureArray } from '../transaction/serializeTransaction.js';
/*
 * Serializes an EIP-7702 authorization list.
 */
export function serializeAuthorizationList(authorizationList) {
    if (!authorizationList || authorizationList.length === 0)
        return [];
    const serializedAuthorizationList = [];
    for (const authorization of authorizationList) {
        const { chainId, nonce, ...signature } = authorization;
        const contractAddress = authorization.address;
        const signatureArray = toYParitySignatureArray({}, signature);
        // EIP-7702 permits any `y_parity` below 2**8 in an authorization tuple, and a
        // tuple that fails recovery does not invalidate the transaction. Encode a
        // numeric `yParity` as is, so that serialization preserves the transaction hash.
        if (signatureArray.length > 0 && signature.yParity)
            signatureArray[0] = toHex(signature.yParity);
        serializedAuthorizationList.push([
            chainId ? toHex(chainId) : '0x',
            contractAddress,
            nonce ? toHex(nonce) : '0x',
            ...signatureArray,
        ]);
    }
    return serializedAuthorizationList;
}
//# sourceMappingURL=serializeAuthorizationList.js.map