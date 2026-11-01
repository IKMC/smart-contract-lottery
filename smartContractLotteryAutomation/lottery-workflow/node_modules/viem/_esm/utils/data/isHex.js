export function isHex(value, { even = false, strict = true, } = {}) {
    if (!value)
        return false;
    if (typeof value !== 'string')
        return false;
    if (even && value.length % 2 !== 0)
        return false;
    return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith('0x');
}
//# sourceMappingURL=isHex.js.map