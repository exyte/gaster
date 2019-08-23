import arg from 'arg';
import inquirer from 'inquirer';
import { getGasStats } from './main';

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--address': String,
            '--startblock': Number,
            '--endblock': Number,
            '--path': String,
            '--mongo': Boolean,
            '-a': '--address',
            '-s': '--startblock',
            '-e': '--endblock',
            '-p': '--path',
            '-m': '--mongo'
        },
        {
            argv: rawArgs.slice()
        }
    );

    return {
        address: args['--address'] || false,
        startblock: args['--startblock'] || false,
        endblock: args['--endblock'] || false,
        path: args['--path'] || false,
        mongo: args['--mongo'] || false
    }
}

async function promptForMissingOptions(options) {
    const questions = [];

    if (!options.address) {
        questions.push({
            type: 'input',
            name: 'address',
            message: 'Please enter smart-contract address to use'
        })
    }

    const answers = await inquirer.prompt(questions);

    return {
        ...options,
        ...answers
    }
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingOptions(options);

    await getGasStats(options);
}
