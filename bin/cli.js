#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const isValid = require('is-valid-path');
const { getGasStats } = require('../src/index');

const emptyABI = [];

const isValidPath = (path) => {
    if (!isValid(path)) {
        console.error('\x1b[31m%s\x1b[0m', `${path} is not a valid path\n`);
        return false;
    }
    return true;
};

const getAbi = (path) => {
    try {
        const abi = fs.readFileSync(path);
        return JSON.parse(abi)
    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', `${err}`);
        return emptyABI
    }
};

program
    .description('This utility gets info of transactions for the specified <address> of a smart contract.\n' +
        'Supported <net> types:\n' +
        '- mainnet,\n' +
        '- ropsten,\n' +
        '- kovan,\n' +
        '- rinkeby,\n' +
        '- goerli')

    .version(require('../package.json').version)
    .arguments('<address>')
    .option('-s, --startblock <startblock>', 'Start block number')
    .option('-e, --endblock <endblock>', 'End block number')
    .option('-n, --net <net>', 'Network on which specified smart contract is deployed', 'mainnet')
    .option('-a, --abi <abi>', 'Path to *.json file with Ethereum smart contract ABIs in appropriate format')
    .option('-p, --path <path>', 'Path to *.csv')
    .option('-r, --recursive', 'Search transactions recursively through the hierarchy of smart contracts', false)
    .action(async (address, cmd) => {
        const {
            startblock,
            endblock,
            net,
            abi,
            path,
            recursive,
        } = cmd.opts();



        const options = {
            startblock,
            endblock,
            net,
            recursive,
            cli: true,
            ...(path && isValidPath(path) ? { path } : {}),
            ...(abi && isValidPath(abi) ? { abi: getAbi(abi) } : {})
        };

        await getGasStats(address.toLowerCase(), options)
    });

program.parse(process.argv);
