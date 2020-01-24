const arg = require('arg');
const inquirer = require( 'inquirer');
const { getGasStats } = require('./main');

const parseArgumentsIntoOptions = (rawArgs) => {
    const args = arg(
        {
            '--address': String,
            '--abi': String,
            '--startblock': Number,
            '--endblock': Number,
            '--path': String,
            '--ropsten': Boolean,
            '--trace' : Boolean,
            '-a': '--address',
            '-s': '--startblock',
            '-e': '--endblock',
            '-p': '--path',
            '-r': '--ropsten',
        },
        {
            argv: rawArgs.slice()
        }
    );

    return {
        address: args['--address'] || false,
        abi: args['--abi'] || false,
        startblock: args['--startblock'] || false,
        endblock: args['--endblock'] || false,
        path: args['--path'] || false,
        ropsten: args['--ropsten'] || false,
        trace: args['--trace'] || false,
    }
};

const promptForMissingOptions = async (options) => {
    const questions = [];

    if (!options.address) {
        questions.push({
            type: 'input',
            name: 'address',
            message: 'Please enter smart contract address to use'
        })
    }

    const answers = await inquirer.prompt(questions);

    return {
        ...options,
        ...answers
    }
};

const cli = async (args) => {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingOptions(options);

    await getGasStats(options);
};

module.exports = { cli };

