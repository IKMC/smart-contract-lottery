import * as Address from '../Address.js';
import * as Errors from '../Errors.js';
import { getArrayComponents } from './abiParameters.js';
/** @internal */
export function normalizeSignature(signature) {
    let active = true;
    let current = '';
    let level = 0;
    let result = '';
    let valid = false;
    for (let i = 0; i < signature.length; i++) {
        const char = signature[i];
        // If the character is a separator, we want to reactivate.
        if (['(', ')', ','].includes(char))
            active = true;
        // If the character is a "level" token, we want to increment/decrement.
        if (char === '(')
            level++;
        if (char === ')')
            level--;
        // If we aren't active, we don't want to mutate the result.
        if (!active)
            continue;
        // If level === 0, we are at the definition level.
        if (level === 0) {
            if (char === ' ' && ['event', 'function', 'error', ''].includes(result))
                result = '';
            else {
                result += char;
                // If we are at the end of the definition, we must be finished.
                if (char === ')') {
                    valid = true;
                    break;
                }
            }
            continue;
        }
        // Ignore spaces
        if (char === ' ') {
            // A space directly after a `(` or `,` separator is leading whitespace.
            // Otherwise, it ends the type, so we want to deactivate.
            if (!current.endsWith(',') && !current.endsWith('(')) {
                current = '';
                active = false;
            }
            continue;
        }
        result += char;
        current += char;
    }
    if (!valid)
        throw new Errors.BaseError('Unable to normalize signature.');
    return result;
}
/** @internal */
export function isArgOfType(arg, abiParameter) {
    const argType = typeof arg;
    const abiParameterType = abiParameter.type;
    switch (abiParameterType) {
        case 'address':
            return Address.validate(arg, { strict: false });
        case 'bool':
            return argType === 'boolean';
        case 'function':
            return argType === 'string';
        case 'string':
            return argType === 'string';
        default: {
            if (abiParameterType === 'tuple' && 'components' in abiParameter)
                return Object.values(abiParameter.components).every((component, index) => {
                    return (argType === 'object' &&
                        isArgOfType(getComponentValue(arg, component, index), component));
                });
            // `(u)int<M>`: (un)signed integer type of `M` bits, `0 < M <= 256`, `M % 8 == 0`
            // https://regexr.com/6v8hp
            if (/^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(abiParameterType))
                return argType === 'number' || argType === 'bigint';
            // `bytes<M>`: binary type of `M` bytes, `0 < M <= 32`
            // https://regexr.com/6va55
            if (/^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(abiParameterType))
                return argType === 'string' || arg instanceof Uint8Array;
            // fixed-length (`<type>[M]`) and dynamic (`<type>[]`) arrays
            const arrayComponents = getArrayComponents(abiParameterType);
            if (arrayComponents) {
                const [length, type] = arrayComponents;
                return (Array.isArray(arg) &&
                    (length === null || arg.length === length) &&
                    arg.every((x) => isArgOfType(x, {
                        ...abiParameter,
                        type,
                    })));
            }
            return false;
        }
    }
}
/** @internal */
export function getAmbiguousTypes(sourceParameters, targetParameters, args) {
    for (const parameterIndex in sourceParameters) {
        const sourceParameter = sourceParameters[parameterIndex];
        const targetParameter = targetParameters[parameterIndex];
        if (!targetParameter)
            continue;
        if (sourceParameter.type === 'tuple' &&
            targetParameter.type === 'tuple' &&
            'components' in sourceParameter &&
            'components' in targetParameter) {
            const value = args[parameterIndex];
            const types = getAmbiguousTypes(sourceParameter.components, targetParameter.components, sourceParameter.components.map((component, index) => getComponentValue(value, component, index)));
            if (types)
                return types;
            continue;
        }
        const sourceArray = getArrayComponents(sourceParameter.type);
        const targetArray = getArrayComponents(targetParameter.type);
        if (sourceArray && targetArray) {
            // Every item matches both element types, so the first item (or `undefined` for an empty array) decides.
            const types = getAmbiguousTypes([
                {
                    ...sourceParameter,
                    type: sourceArray[1],
                },
            ], [
                {
                    ...targetParameter,
                    type: targetArray[1],
                },
            ], [args[parameterIndex]?.[0]]);
            if (types)
                return types;
            continue;
        }
        const types = [sourceParameter.type, targetParameter.type];
        const value = args[parameterIndex];
        const ambiguous = (() => {
            if (types.includes('address') && types.includes('bytes20'))
                return true;
            // An `undefined` value comes from an empty array, which matches both types.
            if (types.includes('address') &&
                (types.includes('string') || types.includes('bytes')))
                return (value === undefined ||
                    Address.validate(value, { strict: false }));
            return false;
        })();
        if (ambiguous)
            return types;
    }
    return;
}
// Reads a tuple component's value by index from arrays and by name from objects, like `AbiParameters.encode`.
function getComponentValue(arg, component, index) {
    if (Array.isArray(arg))
        return arg[index];
    return arg?.[component.name];
}
//# sourceMappingURL=abiItem.js.map