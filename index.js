const { getGasStats } = require('./src/main.js');
const { NetworkName } = require('./src/core/enums');

(async function () {
    const options = {
        address: '0x5931382a5A15D7A6c2aFD6A331eAae9751Faf1Cf',
        abi: './abi.json',
        net: NetworkName.MAINNET,
    };
    const result = await getGasStats(options);
})();

module.exports = require('./src/main.js');
