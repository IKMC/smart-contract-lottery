"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add = add;
exports.addSync = addSync;
exports.changeOwner = changeOwner;
exports.changeOwnerSync = changeOwnerSync;
exports.changeStatus = changeStatus;
exports.changeStatusSync = changeStatusSync;
exports.getNextFullDkgCeremony = getNextFullDkgCeremony;
exports.getOwner = getOwner;
exports.get = get;
exports.getByIndex = getByIndex;
exports.getCount = getCount;
exports.list = list;
exports.setNextFullDkgCeremony = setNextFullDkgCeremony;
exports.setNextFullDkgCeremonySync = setNextFullDkgCeremonySync;
exports.update = update;
exports.updateSync = updateSync;
const readContract_js_1 = require("../../actions/public/readContract.js");
const writeContract_js_1 = require("../../actions/wallet/writeContract.js");
const writeContractSync_js_1 = require("../../actions/wallet/writeContractSync.js");
const Abis = require("../Abis.js");
const Addresses = require("../Addresses.js");
const errors_js_1 = require("../internal/errors.js");
const utils_js_1 = require("../internal/utils.js");
async function add(client, parameters) {
    return add.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (add) {
    async function inner(action, client, parameters) {
        const { newValidatorAddress, publicKey, active, inboundAddress, outboundAddress, ...rest } = parameters;
        const callData = add.call({
            newValidatorAddress,
            publicKey,
            active,
            inboundAddress,
            outboundAddress,
        });
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            ...callData,
        }));
    }
    add.inner = inner;
    function call(args) {
        const { newValidatorAddress, publicKey, active, inboundAddress, outboundAddress, } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [
                newValidatorAddress,
                publicKey,
                active,
                inboundAddress,
                outboundAddress,
            ],
            functionName: 'addValidator',
        });
    }
    Object.defineProperty(add, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(add || (exports.add = add = {}));
async function addSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await add.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
async function changeOwner(client, parameters) {
    return changeOwner.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (changeOwner) {
    async function inner(action, client, parameters) {
        const { newOwner, ...rest } = parameters;
        const callData = changeOwner.call({ newOwner });
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            ...callData,
        }));
    }
    changeOwner.inner = inner;
    function call(args) {
        const { newOwner } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [newOwner],
            functionName: 'changeOwner',
        });
    }
    Object.defineProperty(changeOwner, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(changeOwner || (exports.changeOwner = changeOwner = {}));
async function changeOwnerSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await changeOwner.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
async function changeStatus(client, parameters) {
    return changeStatus.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (changeStatus) {
    async function inner(action, client, parameters) {
        const { validator, active, ...rest } = parameters;
        const callData = changeStatus.call({ validator, active });
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            ...callData,
        }));
    }
    changeStatus.inner = inner;
    function call(args) {
        const { validator, active } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [validator, active],
            functionName: 'changeValidatorStatus',
        });
    }
    Object.defineProperty(changeStatus, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(changeStatus || (exports.changeStatus = changeStatus = {}));
async function changeStatusSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await changeStatus.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
async function getNextFullDkgCeremony(client, parameters = {}) {
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...parameters,
        ...getNextFullDkgCeremony.call(),
    });
}
(function (getNextFullDkgCeremony) {
    function call() {
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [],
            functionName: 'getNextFullDkgCeremony',
        });
    }
    Object.defineProperty(getNextFullDkgCeremony, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(getNextFullDkgCeremony || (exports.getNextFullDkgCeremony = getNextFullDkgCeremony = {}));
async function getOwner(client, parameters = {}) {
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...parameters,
        ...getOwner.call(),
    });
}
(function (getOwner) {
    function call() {
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [],
            functionName: 'owner',
        });
    }
    Object.defineProperty(getOwner, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(getOwner || (exports.getOwner = getOwner = {}));
async function get(client, parameters) {
    const { validator, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...get.call({ validator }),
    });
}
(function (get) {
    function call(args) {
        const { validator } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [validator],
            functionName: 'validators',
        });
    }
    Object.defineProperty(get, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(get || (exports.get = get = {}));
async function getByIndex(client, parameters) {
    const { index, ...rest } = parameters;
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...rest,
        ...getByIndex.call({ index }),
    });
}
(function (getByIndex) {
    function call(args) {
        const { index } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [index],
            functionName: 'validatorsArray',
        });
    }
    Object.defineProperty(getByIndex, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(getByIndex || (exports.getByIndex = getByIndex = {}));
async function getCount(client, parameters = {}) {
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...parameters,
        ...getCount.call(),
    });
}
(function (getCount) {
    function call() {
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [],
            functionName: 'validatorCount',
        });
    }
    Object.defineProperty(getCount, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(getCount || (exports.getCount = getCount = {}));
async function list(client, parameters = {}) {
    return (0, errors_js_1.withExecutionError)(readContract_js_1.readContract)(client, {
        ...parameters,
        ...list.call(),
    });
}
(function (list) {
    function call() {
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [],
            functionName: 'getValidators',
        });
    }
    Object.defineProperty(list, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(list || (exports.list = list = {}));
async function setNextFullDkgCeremony(client, parameters) {
    return setNextFullDkgCeremony.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (setNextFullDkgCeremony) {
    async function inner(action, client, parameters) {
        const { epoch, ...rest } = parameters;
        const callData = setNextFullDkgCeremony.call({ epoch });
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            ...callData,
        }));
    }
    setNextFullDkgCeremony.inner = inner;
    function call(args) {
        const { epoch } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [epoch],
            functionName: 'setNextFullDkgCeremony',
        });
    }
    Object.defineProperty(setNextFullDkgCeremony, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(setNextFullDkgCeremony || (exports.setNextFullDkgCeremony = setNextFullDkgCeremony = {}));
async function setNextFullDkgCeremonySync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await setNextFullDkgCeremony.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
async function update(client, parameters) {
    return update.inner(writeContract_js_1.writeContract, client, parameters);
}
(function (update) {
    async function inner(action, client, parameters) {
        const { newValidatorAddress, publicKey, inboundAddress, outboundAddress, ...rest } = parameters;
        const callData = update.call({
            newValidatorAddress,
            publicKey,
            inboundAddress,
            outboundAddress,
        });
        return (await (0, errors_js_1.withExecutionError)(action)(client, {
            ...rest,
            ...callData,
        }));
    }
    update.inner = inner;
    function call(args) {
        const { newValidatorAddress, publicKey, inboundAddress, outboundAddress } = args;
        return (0, utils_js_1.defineCall)({
            address: Addresses.validator,
            abi: Abis.validatorConfig,
            args: [newValidatorAddress, publicKey, inboundAddress, outboundAddress],
            functionName: 'updateValidator',
        });
    }
    Object.defineProperty(update, "call", { configurable: true, enumerable: true, value: call, writable: true });
})(update || (exports.update = update = {}));
async function updateSync(client, parameters) {
    const { throwOnReceiptRevert = true, ...rest } = parameters;
    const receipt = await update.inner(writeContractSync_js_1.writeContractSync, client, {
        ...rest,
        throwOnReceiptRevert,
    });
    return { receipt };
}
//# sourceMappingURL=validator.js.map