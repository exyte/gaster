# Ethereum GAS stats

A CLI to get transactions of the specified smart contract and get some statistics.

## Setup
* Install node package manager [npm](https://nodejs.org/en/download/)

* Install project's dependencies
```bash
npm install
```

## Command Line Interface
ethgasstats can be called from the command line if installed globally (using the -g flag)
```bash
Usage: ethgasstats [options]


Options:

  -a, --address <address>              Smart contract address.
  -s, --startblock <number>            Start block number. Defaults to smart contract genesis block.
  -e, --endblock <number>              End block number. Defaults to smart contract last transaction block.
  -p, --path <path>                    Path and name of the resulting csv file. Defaults to stdout.
  -m, --mongo <boolean>                Use MongoDB to save transactions' data. Defaults to false.
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)



