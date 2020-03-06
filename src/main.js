const InputDataDecoder = require('ethereum-input-data-decoder');
const fs = require('fs');
const isValid = require('is-valid-path');
const { parseAsync } = require('json2csv');
const {
    HttpRequestMethod,
    apiHttpRequest
} = require('./utils');
const { createLogger, format, transports } = require('winston');

const ethApiUrl = 'https://api.etherscan.io/api';
const ethRopstenApiUrl = 'https://api-ropsten.etherscan.io/api';

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'ethgasstats' },
    transports: [
        new transports.File({ filename: 'ethgasstats-error.log', level: 'error' }),
        new transports.File({ filename: 'ethgasstats-combined.log' })
    ]
});


const getGasStats = async (options) => {
    this.txs = [];
    this.itxs = [];
    this.addresses = new Set();
    this.abis = new Map();
    this.features = [];

    if (!options.address) {
        console.error('Smart contract address is not specified!');
        return;
    }

    this.addresses.add(options.address);

    const validationResult = await validateContractAddress(options);

    if (!validationResult.validated) {
        console.error(`Error validating contract address: ${validationResult.err}`);
        return;
    }

    try {
        await getTxInfo(options, this);
        await getITxInfo(options, this);
        await mergeTxInfo(this);
        await getAbis(options, this);
        await prepareTxsData(options, this);
        await persistTxsData(options, this);
    }
    catch (err) {
        process.exit(1)
    }

    process.exit(0);
};

const validateContractAddress = async (options) => {
    let result = {
        validated: true,
        err: ''
    };

    const apiUrl = options.ropsten ? ethRopstenApiUrl: ethApiUrl;
    const pathParams = [];
    const params = {
        module: 'proxy',
        action: 'eth_getCode',
        address: options.address
    };
    const method = HttpRequestMethod.GET;
    const response = await apiHttpRequest({
        apiUrl,
        pathParams,
        params,
        method
    });

    if (response.error) {
        result.err = 'Address specified is invalid';
        result.validated = false;
    }

    if (response.result === '0x') {
        result.err = 'Address specified is for External Owned Account';
        result.validated = false;
    }

    return result;
};

const getTxInfo = async (options, obj) => {
    const offset = 200;
    const apiUrl = options.ropsten ? ethRopstenApiUrl: ethApiUrl;
    const pathParams = [];
    let params = {
        module: 'account',
        action: 'txlist',
        address: options.address,
        startblock: options.startblock,
        endblock: options.endblock,
        sort: 'asc',
        page: 1,
        offset
    };
    const method = HttpRequestMethod.GET;

    let next = false;

    do {
        const response = await apiHttpRequest({
            apiUrl,
            pathParams,
            params,
            method
        });

        next = response.result.length === offset;

        obj.txs = obj.txs.concat(response.result);
        ++params.page;

    } while (next);

    obj.txs = obj.txs.filter((tx) => tx.isError === '0' && undefined !== tx.to && tx.to.toLowerCase() === options.address.toLowerCase());

  };

const getITxInfo = async (options, obj) => {
    const offset = 200;
    const apiUrl = options.ropsten ? ethRopstenApiUrl: ethApiUrl;
    const pathParams = [];
    let params = {
        module: 'account',
        action: 'txlistinternal',
        address: options.address,
        startblock: options.startblock,
        endblock: options.endblock,
        sort: 'asc',
        page: 1,
        offset
    };
    const method = HttpRequestMethod.GET;

    let next = false;

    do {
        const response = await apiHttpRequest({
            apiUrl,
            pathParams,
            params,
            method
        });

        next = response.result.length === offset;

        obj.itxs = obj.itxs.concat(response.result);
        ++params.page;

    } while (next);

    obj.itxs = obj.itxs.filter((tx) => tx.isError === '0' && tx.type === 'delegatecall');

 };

const mergeTxInfo = (obj) => {
    obj.itxs.forEach((itx) => {
        const tx = obj.txs.find(tx => tx.hash === itx.hash);
        if (undefined !== tx) {
            tx.contractAddress = itx.to;
        }
    });

    obj.txs.forEach((tx) => {
        if(!tx.contractAddress) {
            tx.contractAddress = tx.to;
        }
    });

    obj.txs.forEach((tx) => {
        if (!obj.addresses.has(tx.contractAddress.toLowerCase())) {
            obj.addresses.add(tx.contractAddress.toLowerCase());
        }
    });
};

const getAbis = async (options, obj) => {
    if (options.abi) {

        if(isValid(options.abi)) {
            try {
                options.abi = fs.readFileSync(options.abi);
            } catch (err) {
                logger.error(`Error occurred on reading abi file: ${err}`);
                options.abi = '[]';
            }
        }

        const abis = JSON.parse(options.abi);
        if (abis.length === 1 && !abis[0].address) {
            const decoder = (() => {
                try {
                    return new InputDataDecoder(abis);
                } catch(err) {
                    logger.error(new Error(`Error occurred on creating txs' input data decoder for address ${options.address}: ${err}`));
                    return undefined;
                }
            })();
            obj.abis.set(options.address.toLowerCase(), {
                abi: abis,
                decoder
            });
        } else {
            abis.forEach(item => {
                const decoder = (() => {
                    try {
                        return new InputDataDecoder(item.abi);
                    } catch(err) {
                        logger.error(new Error(`Error occurred on creating txs' input data decoder for address ${item.address}: ${err}`));
                        return undefined;
                    }
                })();
                obj.abis.set(item.address.toLowerCase(), {
                    abi: item.abi,
                    decoder
                });
            })
        }
    }

    let promises = [];

    obj.addresses.forEach(async (address) => {
        if (obj.abis.has(address.toLowerCase())) {
            return;
        }
       
        promises.push(new Promise((resolve, reject) => getAbi(address, options.ropsten)
            .then(async (result) => {
                if (result.err) {
                    result.abi = '[]';
                    logger.error(new Error(`Error occurred on getting contract ${address} abi: ${result.err}`));
                }
                const abi = JSON.parse(result.abi);
                const decoder = (() => {
                    try {
                        return new InputDataDecoder(abi);
                    } catch(err) {
                        logger.error(new Error(`Error occurred on creating txs' input data decoder for address ${address}: ${err}`));
                        return undefined;
                    }
                })();
                obj.abis.set(address, {
                    abi,
                    decoder
                });
                resolve();
            })
            .catch(err => {
                logger.error(new Error(`Error occurred on getting contract ${address} abi: ${err}`));
            })));
    });

    await Promise.all(promises);
};

const getAbi = async (address, testnet) => {
    let result = {
        abi: '[]',
        err: ''
    };

    const apiUrl = testnet ? ethRopstenApiUrl: ethApiUrl;
    const pathParams = [];
    const params = {
        module: 'contract',
        action: 'getabi',
        address
    };
    const method = HttpRequestMethod.GET;
    const response = await apiHttpRequest({
        apiUrl,
        pathParams,
        params,
        method
    });

    result.abi = response.result;

    if (response.error) {
        result.err = response.error;
        result.abi = '[]';
    }

    if (response.message === 'NOTOK') {
        result.err = response.result;
        result.abi = '[]';
    }

    return result;
};

const prepareTxsData = async function (options, obj) {
    obj.txs.forEach((tx) => {
        const item = obj.abis.get(tx.contractAddress.toLowerCase());
        if (item && item.decoder) {
            tx.input = item.decoder.decodeData(tx.input);
            obj.features.concat(getFeatures(tx, tx.input));
            tx.inputs = tx.input.inputs;
            tx.method = tx.input.method;
            tx.types = tx.input.types;
            tx.names = tx.input.names;
        }
    });
    if (options.trace) {
        obj.features.addUnique('arg__organization_timeStamp');
        const distinctOrganizations = [...new Set(obj.txs.map(tx => `0x${tx['arg__organization'].toLowerCase()}`))];
        const organizationsCreationDates = await distinctOrganizations.reduce(async (pendingResult, organizationAddress) => {
            const previousResult = await pendingResult;
            const creationDate = await getContractCreationDate(organizationAddress, options);
            const result = {
                [organizationAddress]: creationDate,
                ...previousResult
            };
            return result
        }, {});
        obj.txs.forEach(tx => tx['arg__organization_timeStamp'] = Number(organizationsCreationDates[`0x${tx['arg__organization'].toLowerCase()}`]))
    }
};

const getFeatures = (data, input) => {
    let features = new Array();
    const re = /(\w+)(\[])/;
    input.types.forEach((type, index) => {
        let typeParts = type.split(re);

        features.addUnique(`arg_${input.names[index]}`);
        data[`arg_${input.names[index]}`] = input.inputs[index];

        //fixme
        typeParts = typeParts.filter((el) => {
            return el !== '';
        });

        if (typeParts.length > 1 && typeParts[1] === '[]') {
            features.addUnique(`arg_${input.names[index]}_length`);
            data[`arg_${input.names[index]}_length`] = input.inputs[index].length;
            if (typeParts[0].match('int') !== null) {
                features.addUnique(`arg_${input.names[index]}_min`);
                data[`arg_${input.names[index]}_min`] = Math.min(...input.inputs[index]);
                features.addUnique(`arg_${data.names[index]}_max`);
                data[`arg_${input.names[index]}_max`] = Math.max(...input.inputs[index]);
            }
            if (typeParts[0].match('string') !== null || typeParts[0].match('byte') !== null || typeParts[0].match('hex') !== null) {
                const strLenArr = input.inputs[index].map((str) => {
                    return str.length;
                });
                features.addUnique(`arg_${input.names[index]}_minLength`);
                data[`arg_${input.names[index]}_minLength`] = Math.min(...strLenArr);
                features.addUnique(`arg_${input.names[index]}_maxLength`);
                data[`arg_${input.names[index]}_maxLength`] = Math.max(...strLenArr);

                let numArray = input.inputs[index].map((str) => {
                    return isNaN ? false : Number(str);
                });

                numArray = numArray.filter((el) => {
                    return el;
                });

                if (numArray.length) {
                    features.addUnique(`arg_${input.names[index]}_min`);
                    data[`arg_${input.names[index]}_min`] = Math.min(...numArray);
                    features.addUnique(`arg_${input.names[index]}_max`);
                    data[`arg_${input.names[index]}_max`] = Math.max(...numArray);
                }
            }
            return;
        }

        if (typeParts[0].match('byte') !== null) {
            features.addUnique(`arg_${input.names[index]}_length`);
            data[`arg_${input.names[index]}_length`] = input.inputs[index].length;
        }

        if (typeParts[0].match('string') !== null) {
            features.addUnique(`arg_${input.names[index]}_length`);
            data[`arg_${input.names[index]}_length`] = input.inputs[index].length;

            if(input.inputs[index] && !isNaN(input.inputs[index])) {
                features.addUnique(`arg_${input.names[index]}_num`);
                data[`arg_${input.names[index]}_num`] = input.inputs[index];
            }
        }
    })

    return features;
};

const persistTxsData = async function (options, obj) {
    if (!obj.txs.length) {
        throw new Error(`There is no transactions to process`);
    }

    
    const fields = [
        {
            label: 'address',
            value: 'to',
            default: 'NULL'
        },
        {
            label: 'blockNumber',
            value: (row, field) => Number(row[field.label]),
            default: 'NULL'
        },
        {
            label: 'gasUsed',
            value: (row, field) => Number(row[field.label]),
            default: 'NULL'
        },
        {
            label: 'gasPrice',
            value: (row, field) => Number(row[field.label]),
            default: 'NULL'
        },
        {
            label: 'gas',
            value: (row, field) => Number(row[field.label]),
            default: 'NULL'
        },
        'from',
        'input',
        'method',
        'types',
        'inputs',
        'names',
        'hash',
        {
            label: 'timeStamp',
            value: (row, field) => Number(row[field.label]),
            default: 'NULL'
        },
        ...obj.features
    ];
    const opts = { fields };
    let promises = [];

    try {
        const chunk = 1000;
        const quantity = Math.ceil(obj.txs.length / chunk);
        for (let i = 0; i < quantity; ++i) {
            const ttxs = obj.txs.slice(i * chunk, (i + 1) * chunk);

            const fname = `${options.address}_${i}.csv`;
            const fpath = `${options.path ? options.path : process.cwd()}/${fname}`;

            promises.push(new Promise((resolve, reject) => parseAsync(ttxs, opts)
                .then(async (csv) => {
                    let writeStream = fs.createWriteStream(fpath);
                    writeStream.write(csv, 'utf-8');

                    writeStream.on('finish', () => {
                        resolve();
                    });

                    writeStream.end();
                })
                .catch(err => {
                    reject(`An error occurred on txs data processing to csv: ${err}; file: ${fpath}`);
                })));

            await Promise.all(promises);
        }
    } catch (err) {
        throw new Error(`An error occurred on data persisting: ${err}`);
    }
};

const getContractCreationDate = async function (address, options) {
    const apiUrl = options.ropsten ? ethRopstenApiUrl: ethApiUrl;
    const pathParams = [];
    let params = {
        module: 'account',
        action: 'txlistinternal',
        address: address,
        sort: 'asc',
        page: 1,
    };
    const method = HttpRequestMethod.GET;

    const response = await apiHttpRequest({
        apiUrl,
        pathParams,
        params,
        method
    });

    if (!response.result.length) {
        return 0
    }
    const result = response.result[0];
    return result.timeStamp
};

if (typeof(Array.prototype.addUnique) !== 'function') {
    Array.prototype.addUnique = function(el) {
        if (!this.includes(el)) {
            this.push(el);
        }
    };
}

module.exports = { getGasStats, validateContractAddress };
