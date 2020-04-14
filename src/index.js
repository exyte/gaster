const {
    validateContractAddress,
    getTxInfo,
    getCreatedContracts,
    getDecoders,
    decodeAndProcessTxsData,
    persistTxsData
} = require('./core/common');

const getGasStats = async (address, options) => {
    if (!address) {
        console.error('Smart contract address is not specified!');
        return;
    }

    const validationResult = await validateContractAddress(address, options);

    if (!validationResult.validated) {
        console.error(`Error validating contract address: ${validationResult.err}`);
        return;
    }

    const txs = await getTxInfo(address, options);
    if (options.recursive) {
        const createdContracts = getCreatedContracts(txs);
        // fetch sequentially, not parallel, due to etherscan.io restrictions
        // TODO: make bunches, too slow
        for (let i = 0; i < createdContracts.length; ++i) {
            const ctxs =  await getTxInfo(createdContracts[i], options);
            txs.push(...ctxs)
        }
    }
    const abis = getDecoders(options.abi);
    const txsData = await decodeAndProcessTxsData(txs, abis, options);
    if(options.cli) {
        await persistTxsData(txsData, options);
    }

    return txsData;
};

module.exports = { getGasStats };
