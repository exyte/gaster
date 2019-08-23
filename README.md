# Ethereum GAS stats

A CLI to get transactions of the specified smart contract and get some statistics.

## Setup
* Install node package manager [npm](https://nodejs.org/en/download/)

* Install project's dependencies
```bash
npm install
```

## Using ethgasstats CLI
### Command Line
```bash
$ ethgasstats <options>
```


### Options:

*  `-a`, `--address`: *[string]* Smart contract address. 
*  `-s`, `--startblock`: *[number, optional]* Start block number. Default: smart contract genesis block.
*  `-e`, `--endblock`: *[number, optional]* End block number. Default: smart contract last transaction block.
*  `-p`, `--path`: *[string, optional]* Directory of the resulting csv files. Defaults to cwd.
*  `-r`, `--ropsten`: *[boolean, optional]* Use Ropsten (testnet).. Defaults to false.
*  `-m`, `--mongo`: *[boolean, optional]* Use MongoDB to save transactions' data. Defaults to false.
  
### Example:
```bash
ethgasstats --address 0x4Ca389fAAd549aDd7124f2B215266cE162D964e7 -endblock 6050576 --ropsten
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)



