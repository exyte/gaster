const main = require('../src/main');
const { NetworkName } = require('../src/core/enums');
const assert = require('assert');

describe('main.js', function() {
  describe('#validateContractAddress(options)', function() {
    it('should return { validated: true, err: \'\' } with address=0x091bb13E6e55F07E9A42CBAa59e2c225C4a96E47 and ropsten=true', async function() {
      let result = await main.validateContractAddress({
        net: NetworkName.ROPSTEN,
        address: '0x091bb13E6e55F07E9A42CBAa59e2c225C4a96E47'
      })

      assert.equal(result.validated, true);
      assert.equal(result.err, '');
    });
  });
});