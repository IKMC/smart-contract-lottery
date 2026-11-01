"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbiItem = getAbiItem;
exports.isArgOfType = isArgOfType;
exports.getAmbiguousTypes = getAmbiguousTypes;
const abi_js_1 = require("../../errors/abi.js");
const isHex_js_1 = require("../../utils/data/isHex.js");
const isAddress_js_1 = require("../address/isAddress.js");
const toEventSelector_js_1 = require("../hash/toEventSelector.js");
const toFunctionSelector_js_1 = require("../hash/toFunctionSelector.js");
const encodeAbiParameters_js_1 = require("./encodeAbiParameters.js");
function getAbiItem(parameters) {
    const { abi, args = [], name } = parameters;
    const isSelector = (0, isHex_js_1.isHex)(name, { strict: false });
    const abiItems = abi.filter((abiItem) => {
        if (isSelector) {
            if (abiItem.type === 'function')
                return (0, toFunctionSelector_js_1.toFunctionSelector)(abiItem) === name;
            if (abiItem.type === 'event')
                return (0, toEventSelector_js_1.toEventSelector)(abiItem) === name;
            return false;
        }
        return 'name' in abiItem && abiItem.name === name;
    });
    if (abiItems.length === 0)
        return undefined;
    if (abiItems.length === 1)
        return abiItems[0];
    let matchedAbiItem;
    for (const abiItem of abiItems) {
        if (!('inputs' in abiItem))
            continue;
        if (!args || args.length === 0) {
            if (!abiItem.inputs || abiItem.inputs.length === 0)
                return abiItem;
            continue;
        }
        if (!abiItem.inputs)
            continue;
        if (abiItem.inputs.length === 0)
            continue;
        if (abiItem.inputs.length !== args.length)
            continue;
        const matched = args.every((arg, index) => {
            const abiParameter = 'inputs' in abiItem && abiItem.inputs[index];
            if (!abiParameter)
                return false;
            return isArgOfType(arg, abiParameter);
        });
        if (matched) {
            if (matchedAbiItem &&
                'inputs' in matchedAbiItem &&
                matchedAbiItem.inputs) {
                const ambiguousTypes = getAmbiguousTypes(abiItem.inputs, matchedAbiItem.inputs, args);
                if (ambiguousTypes)
                    throw new abi_js_1.AbiItemAmbiguityError({
                        abiItem,
                        type: ambiguousTypes[0],
                    }, {
                        abiItem: matchedAbiItem,
                        type: ambiguousTypes[1],
                    });
            }
            matchedAbiItem = abiItem;
        }
    }
    if (matchedAbiItem)
        return matchedAbiItem;
    return abiItems[0];
}
function isArgOfType(arg, abiParameter) {
    const argType = typeof arg;
    const abiParameterType = abiParameter.type;
    switch (abiParameterType) {
        case 'address':
            return (0, isAddress_js_1.isAddress)(arg, { strict: false });
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
            const arrayComponents = (0, encodeAbiParameters_js_1.getArrayComponents)(abiParameterType);
            if (arrayComponents) {
                const [length, type] = arrayComponents;
                return (Array.isArray(arg) &&
                    (length === null || arg.length === length) &&
                    arg.every((x) => isArgOfType(x, { ...abiParameter, type })));
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
        const sourceArray = (0, encodeAbiParameters_js_1.getArrayComponents)(sourceParameter.type);
        const targetArray = (0, encodeAbiParameters_js_1.getArrayComponents)(targetParameter.type);
        if (sourceArray && targetArray) {
            const types = getAmbiguousTypes([{ ...sourceParameter, type: sourceArray[1] }], [{ ...targetParameter, type: targetArray[1] }], [args[parameterIndex]?.[0]]);
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
                return (value === undefined || (0, isAddress_js_1.isAddress)(value, { strict: false }));
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
//# sourceMappingURL=getAbiItem.js.map