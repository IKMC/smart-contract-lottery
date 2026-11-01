import type { AbiEvent, AbiFunction } from 'abitype';
import type { ErrorType } from '../../errors/utils.js';
import { type HashSignatureErrorType } from './hashSignature.js';
import { type ToSignatureErrorType } from './toSignature.js';
export type ToSignatureHashErrorType = HashSignatureErrorType | ToSignatureErrorType | ErrorType;
/**
 * Returns the hash (of the function/event/error signature) for a given function, event, or error definition.
 */
export declare function toSignatureHash(fn: string | AbiFunction | AbiEvent): `0x${string}`;
//# sourceMappingURL=toSignatureHash.d.ts.map