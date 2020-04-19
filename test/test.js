const main = require('../src/core/common');
const { NetworkName } = require('../src/core/enums');
const assert = require('assert');

describe('Gaster common', function() {
  describe('#validateContractAddress', function() {
    it('should return { validated: true, err: \'\' } with address=0xF324A8f3e0DbeD9059e5acBfC6C53a31A82b6AfB in Ropsten network', async function() {
      const address = '0xF324A8f3e0DbeD9059e5acBfC6C53a31A82b6AfB';
      const options = {
        net: NetworkName.ROPSTEN,
      }
      const result = await main.validateContractAddress(
          address,
          options,
      );

      assert.equal(result.validated, true);
      assert.equal(result.err, '');
    });
  });
});
