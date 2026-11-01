import { hashSignature } from './hashSignature.js';
import { toSignature } from './toSignature.js';
/**
 * Returns the hash (of the function/event/error signature) for a given function, event, or error definition.
 */
export function toSignatureHash(fn) {
    return hashSignature(toSignature(fn));
}
//# sourceMappingURL=toSignatureHash.js.map