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
    let txs = [];
    let itxs = [];
    let abis = new Map();

    if (!options.address) {
        console.error('Smart contract address is not specified!');
        return;
    }

    const validationResult = await validateContractAddress(options);

    if (!validationResult.validated) {
        console.error(`Error validating contract address: ${validationResult.err}`);
        return;
    }

    txs = await getTxInfo(options);
    itxs = await getITxInfo(options);
    txs = mergeTxInfo(txs, itxs);
    const addresses = new Set([options.address, ...getAdresses(txs)]);
    abis = await getAbis(options, addresses);
    txs = await prepareTxsData(options, txs, abis);
    await persistTxsData(options, txs);
};

if (typeof(Array.prototype.addUnique) !== 'function') {
    Array.prototype.addUnique = function(el) {
        if (!this.includes(el)) {
            this.push(el);
        }
    };
}

module.exports = { getGasStats, validateContractAddress };
