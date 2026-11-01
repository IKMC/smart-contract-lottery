"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSignature = normalizeSignature;
exports.isArgOfType = isArgOfType;
exports.getAmbiguousTypes = getAmbiguousTypes;
const Address = require("../Address.js");
const Errors = require("../Errors.js");
const abiParameters_js_1 = require("./abiParameters.js");
function normalizeSignature(signature) {
    let active = true;
    let current = '';
    let level = 0;
    let result = '';
    let valid = false;
    for (let i = 0; i < signature.length; i++) {
        const char = signature[i];
        if (['(', ')', ','].includes(char))
            active = true;
        if (char === '(')
            level++;
        if (char === ')')
            level--;
        if (!active)
            continue;
        if (level === 0) {
            if (char === ' ' && ['event', 'function', 'error', ''].includes(result))
                result = '';
            else {
                result += char;
                if (char === ')') {
                    valid = true;
                    break;
                }
            }
            continue;
        }
        if (char === ' ') {
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
function isArgOfType(arg, abiParameter) {
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
            if (/^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(abiParameterType))
                return argType === 'number' || argType === 'bigint';
            if (/^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(abiParameterType))
                return argType === 'string' || arg instanceof Uint8Array;
            const arrayComponents = (0, abiParameters_js_1.getArrayComponents)(abiParameterType);
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
function getAmbiguousTypes(sourceParameters, targetParameters, args) {
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
        const sourceArray = (0, abiParameters_js_1.getArrayComponents)(sourceParameter.type);
        const targetArray = (0, abiParameters_js_1.getArrayComponents)(targetParameter.type);
        if (sourceArray && targetArray) {
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
function getComponentValue(arg, component, index) {
    if (Array.isArray(arg))
        return arg[index];
    return arg?.[component.name];
}
//# sourceMappingURL=abiItem.js.map