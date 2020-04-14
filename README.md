# Gaster - Ethereum GAS stats

The utility to get info of transactions for the specified smart contract.
The output can be used to analyze gas usage.
Supports smart contracts deployed with Zeppelin OS.

## Setup
* Install node package manager [npm](https://nodejs.org/en/download/)

* Install Gaster from npm: 
```bash
npm install [-g] gaster
```

* Or install Gaster from github:
```bash
npm install [-g] 'https://github.com/exyte/ethgasstats'
```

## Usage
### CLI
```bash
$ gaster <address> <options>
```
*  `<address>`: *[string]* Smart contract address

#### Options:

*  `-s`, `--startblock`: *[number, optional]* Start block number. Default: smart contract genesis block.
*  `-e`, `--endblock`: *[number, optional]* End block number. Default: smart contract last transaction block.
*  `-n`, `--net`: *[boolean, optional]* Network on which specified smart contract is deployed.
*  `-a`,`--abi`: *[string, optional]* Path to *.json file with Ethereum smart contracts' ABIs in appropriate format.
*  `-r`,`--recursive`: *[boolean, optional]* Search transactions recursively through the hierarchy of smart contracts.

#### ABI JSON Format:

Acceptable format (array of objects):
```bash
[
    {
        "address": address1, // address of smart contract
        "abi": abi1, // ABI of smart contract
        "alias": alias // Name of smart contract, optional
    },
    {
        "address": address2,
        "abi": abi2
    },
    ...
]
    
```

#### Output:

Transaction information is saved in CSV format.
Columns:
*  `address` - address of the smart contract (receiving party of the transaction)
*  `caller` - the sending party of the transaction
*  `timeStamp` - timestamp when the transaction was mined
*  `blockNumber` - number of block in which the transaction was recorded
*  `gasUsed` - the exact units of gas that was used for the transaction
*  `gasPrice` - cost per unit of gas specified for the transaction
*  `gas` - maximum amount of gas provided for the transaction
*  `alias` - alias of the smart contract
*  `itxs` - internal transactions (traces) related to the transaction
*  `input` - encoded input data 
*  `method` - method called in the transaction 
*  `parameters` - transaction method parameters decoded with ABI of smart contract
*  `features` - parameters' features

CSV file name has format:

`<contract alias>_<startblock>_<endblock>_<batch number>.csv`

*  `contract alias` - smart contract alias, if the alias was not found, it will be "unidentified"
*  `startblock` - block number on which the search was started
*  `endblock` - block number on which the search was ended
*  `batch number` - all smart contract transactions are divided into batches of 1000 transactions

#### Example:
In terminal run:
```bash
gaster 0xF324A8f3e0DbeD9059e5acBfC6C53a31A82b6AfB -s 7713731 -e 7713749 --net ropsten -r
```

The output should be:

`Gaster_7713731_7713749_0.csv`

| address | caller | timeStamp | blockNumber | gasUsed | gasPrice | gas | alias | itxs | input | method | properties | features |
|---------| ------ |-----------|-------------|---------|----------|-----|-------|------|-------|--------|------------|----------|
|`0xf324a8f3e0dbed9059e5acbfc6c53a31a82b6afb`|`0x4ca389faad549add7124f2b215266ce162d964e7`|1586839485|7713731|557513|100000|557513|`Gaster`|`[]`|`0x60806...10032`|`Contract creation Gaster`|`{}`|`[]`|
|`0xf324a8f3e0dbed9059e5acbfc6c53a31a82b6afb`|`0x4ca389faad549add7124f2b215266ce162d964e7`|1586839616|7713738|245028|100000|245028|`Gaster`|`[{""from"":""0xf324a8f3e0dbed9059e5acbfc6c53a31a82b6afb"",""to"":"""",""contractAddress"":""0x43c685a1a11b8310a21b876d6c7099db62b4dcc9"",""type"":""create"",""input"":"""",""timeStamp"":""1586839616""}]`|`0xfebb0f7e`|`bar`|`{}`|`[]`|
|`0xf324a8f3e0dbed9059e5acbfc6c53a31a82b6afb`|`0x4ca389faad549add7124f2b215266ce162d964e7`|1586839708|7713744|64262|100000|64262|`Gaster`|`[]`|`0xc5d1c9...00000`|`foo`|`{""term"":""a"",""_store"":""hello""}`|`[{""name"":""_store"",""type"":""length"",""value"":5}]`|
|`0xf324a8f3e0dbed9059e5acbfc6c53a31a82b6afb`|`0x4ca389faad549add7124f2b215266ce162d964e7`|1586839797|7713747|67628|100000|68260|`Gaster`|`[{""from"":""0xf324a8f3e0dbed9059e5acbfc6c53a31a82b6afb"",""to"":""0x43c685a1a11b8310a21b876d6c7099db62b4dcc9"",""contractAddress"":"""",""type"":""call"",""input"":"""",""timeStamp"":""1586839797""}]`|`0xf32ca...00000`|`qux`|`{""term"":""64"",""_store"":""hi""}`|`[{""name"":""_store"",""type"":""length"",""value"":2}]`|

`Chaster_7713731_7713749_0.csv`

| address | caller | timeStamp | blockNumber | gasUsed | gasPrice | gas | alias | itxs | input | method | properties | features |
|---------| ------ |-----------|-------------|---------|----------|-----|-------|------|-------|--------|------------|----------|
|`0x43c685a1a11b8310a21b876d6c7099db62b4dcc9`|`0x4ca389faad549add7124f2b215266ce162d964e7`|1586839833|7713749|35107|100000|36507|`Chaster`|`[]`|`0xc5d1c9...00000`|`foo`|`{""term"":""3e8"",""_store"":""hey""}`|`[{""name"":""_store"",""type"":""length"",""value"":3}]`|

### Library
#### Example:
``` js
const { getGasStats } = require('gaster');

const main = async () => {
      const address = '0xF324A8f3e0DbeD9059e5acBfC6C53a31A82b6AfB';
      const options = {
        net: NetworkName.ROPSTEN,
        recursive: true
      };
      const result = await getGasStats(address, options);
      return result;
}
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
Gaster is available under the [MIT](https://choosealicense.com/licenses/mit/) license. See the LICENSE file for more info. 



