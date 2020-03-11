const { getGasStats } = require('./src/main.js');

(async function () {
    const options = {
        address: '0x5931382a5A15D7A6c2aFD6A331eAae9751Faf1Cf',
        abi: './abi.json',
    };
    const result = await getGasStats(options);
})();

module.exports = require('./src/main.js');
