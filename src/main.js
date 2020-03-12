const { 
    validateContractAddress,
    getTxInfo,
    getITxInfo,
    mergeTxInfo,
    getAdresses,
    getAbis,
    prepareTxsData,
    persistTxsData
} = require('./core/common')

const getGasStats = async (options) => {
    if (!options.address) {
        console.error('Smart contract address is not specified!');
        return;
    }

    const validationResult = await validateContractAddress(options);

    if (!validationResult.validated) {
        console.error(`Error validating contract address: ${validationResult.err}`);
        return;
    }

    const txs = await getTxInfo(options);
    const itxs = await getITxInfo(options);
    const mergedTxs = mergeTxInfo(txs, itxs);
    const addresses = new Set([options.address, ...getAdresses(mergedTxs)]);
    const abis = await getAbis(options, addresses);
    const preparedTxs = await prepareTxsData(options, mergedTxs, abis);
    await persistTxsData(options, preparedTxs);
};

module.exports = { getGasStats, validateContractAddress };
