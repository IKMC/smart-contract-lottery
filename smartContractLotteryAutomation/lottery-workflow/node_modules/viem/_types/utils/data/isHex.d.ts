import type { ErrorType } from '../../errors/utils.js';
import type { Hex } from '../../types/misc.js';
export type IsHexErrorType = ErrorType;
export declare function isHex(value: unknown, { even, strict, }?: {
    /**
     * Whether or not to require an even number of hex characters (whole bytes).
     *
     * @default false
     */
    even?: boolean | undefined;
    /**
     * Whether or not to require only hex characters after the `0x` prefix.
     *
     * @default true
     */
    strict?: boolean | undefined;
}): value is Hex;
//# sourceMappingURL=isHex.d.ts.map