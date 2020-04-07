const {
    validateContractAddress,
    getTxInfo,
    getAdresses,
    getAbisAndDecoders,
    revealTxsData,
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
    const abis = await getAbisAndDecoders(address, txs, options);
    const preparedTxs = await revealTxsData(txs, abis);
    await persistTxsData(preparedTxs, options);
};

module.exports = { getGasStats };
