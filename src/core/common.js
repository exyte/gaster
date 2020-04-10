const InputDataDecoder = require('ethereum-input-data-decoder');
const fs = require('fs');
const { parseAsync } = require('json2csv');
const { createLogger, format, transports } = require('winston');
const etherscan = require('./etherscan.api');
const dataFeaturing = require('./data.featuring');

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
    defaultMeta: { service: 'gaster' },
    transports: [
        new transports.File({ filename: 'gaster-error.log', level: 'error' }),
        new transports.File({ filename: 'gaster-combined.log' })
    ]
});

const validateContractAddress = async (address, options) => {
    let result = {
        validated: true,
        err: ''
    };

    const response = await etherscan.validateContractAddress(address, options);

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

const getTxInfo = async (address, options) => {
    const txs = await etherscan.getTxInfo(address, options);
    const itxs = await etherscan.getTxInfo(address, options, true);
    const mergedTxs = mergeTxInfo(txs, itxs);
    return mergedTxs.filter((tx) => tx.isError === '0');
};

const getCreatedContracts = (txs) => {
    const contracts = txs.reduce((agg, tx) => {
        const { itxs } = tx;
        const traces = itxs.filter(itx => itx.type === 'create');
        const contracts = traces.map(trace => trace.contractAddress);
        return [...agg, ...contracts]
    }, []);
    return [...new Set(contracts)];
};

const mergeTxInfo = (txs, itxs) => {
    const itxsIndex = itxs.reduce((agg, itx) => {
        const { from, to, contractAddress, hash, type, input, timeStamp } = itx;
        if(!agg[`${hash}`]) {
            agg[`${hash}`] = []
        }
        agg[`${hash}`].push({ from, to, contractAddress, type, input, timeStamp });
        return agg;
    }, {});

    const mergedTxs = txs.map((tx) => {
        const itxs = itxsIndex[tx.hash] || [];
        return {
            ...tx,
            to: itxs && itxs.length === 1 && itxs[0].type === 'delegatecall' ? itxs[0].to : tx.to,
            itxs,
        }
    });

    return mergedTxs;
};

const getAdresses = (txs) => {
    const addresses = txs.map(tx => tx.to);
    return addresses.filter(address => address.length);
};

const getAbisAndDecoders = async (address, txs, options) => {
    const getDecoder = (abi) => {
        try {
            return new InputDataDecoder(abi);
        } catch(err) {
            logger.error(`Error occurred on creating txs' input data decoder: ${err}`);
            return undefined;
        }
    };

    const optionsAbi = options.abi ? options.abi : [];
    const abisIndexedByAddress = optionsAbi.reduce((agg, obj) => {
        const { address, alias, abi } = obj;
        const decoder = getDecoder(abi);
        if(address) {
            return {
                ...agg,
                [obj.address.toLowerCase()]: {
                    alias,
                    abi,
                    decoder,
                },
            }
        } else {
            if(!agg['unattached']) {
                agg['unattached'] = []
            }
            agg['unattached'].push({
                alias,
                abi,
                decoder,
            });
            return agg
        }
    }, {});

    const addresses = new Set([address, ...getAdresses(txs)]);
    addresses.forEach(async (address) => {
        if (!abisIndexedByAddress[address]) {
            const { abi, err } = await getAbi(address, options);
            if (err) {
                logger.error(`Error occurred on getting contract ${address} abi: ${err}`);
            } else {
                const decoder = getDecoder();
                abisIndexedByAddress[address] = {
                    abi: JSON.parse(abi),
                    alias: '',
                    decoder,
                };
            }
        }
    });

    return abisIndexedByAddress;
};

const getAbi = async (address, options) => {
    let result = {
        abi: '[]',
        err: ''
    };

    const response = await etherscan.getAbi(address, options);

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

const revealTxsData = async function (txs, abis) {
    const decodeTxData = (tx) => {
        const abi = abis[tx.to.toLowerCase()];
        if (abi) {
            return {
                decodedData: abi.decoder.decodeData(tx.input),
                alias: abi.alias,
                err: false,
            }
        }

        const { unattached } = abis;
        if (!unattached || !unattached.length) {
            return {
                decodedData: {},
                alias: '',
                err: true,
            }
        }

        for (let i = 0; i < unattached.length; ++i) {
            const decodedData = unattached[i].decoder.decodeData(tx.input);
            if (decodedData.method !== null) {
                return {
                    decodedData,
                    alias: unattached[i].alias,
                    err: false,
                }
            }
        }

        return {
            decodedData: {},
            alias: '',
            err: true,
        }
    };

    const preparedTxs = txs.map((tx) => {
        const { decodedData, alias, err } = decodeTxData(tx);
        if (err) {
            return tx
        }

        const { method, inputs, types, names } = decodedData;
        const properties = getProperties(decodedData);
        const features = getFeatures(decodedData);

        return {
            ...tx,
            alias,
            method,
            inputs,
            types,
            names,
            properties,
            features,
        };
    });

    return preparedTxs;
};

const getProperties = (data) => {
    return data.names.reduce(function(properties, name, index){
        properties[`${name}`] = data.inputs[index];
        return properties;
    }, {});
};

const getFeatures = (data) => {
    return dataFeaturing.getFeatures(data);
};

const persistTxsData = async function (txs, options) {
    if (!txs.length) {
        logger.error(`There is no transactions to process`);
        return;
    }

    const fields = [
        {
            label: 'address',
            value: 'to',
            default: 'NULL'
        },
        {
            label: 'caller',
            value: 'from',
            default: 'NULL'
        },
        {
            label: 'timeStamp',
            value: (row, field) => Number(row[field.label]),
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
        'alias',
        'itxs',
        'input',
        'method',
        'properties',
        'features',
    ];
    const opts = { fields };
    const promises = [];

    const txsSortedByTimestamp = txs.sort((a, b) => a.timeStamp > b.timeStamp);
    const startblock = options.startblock || 0;
    const endblock = options.endblock || txsSortedByTimestamp.slice(-1)[0].blockNumber;

    const txsIndexedByAlias = txsSortedByTimestamp.reduce((agg, tx) => {
        const alias = tx.alias || 'unidentified';
        if (!agg[`${alias}`]) {
            agg[`${alias}`] = []
        }
        agg[`${alias}`].push(tx);
        return agg;
    }, {});

    const dir =`${options.path ? options.path : process.cwd()}`;

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    Object.keys(txsIndexedByAlias).forEach(async (alias) =>{
        const txsByAlias = txsIndexedByAlias[alias];
        try {
            const chunk = 1000;
            const quantity = Math.ceil(txsByAlias.length / chunk);
            for (let i = 0; i < quantity; ++i) {
                const ttxs = txsByAlias.slice(i * chunk, (i + 1) * chunk);

                const fname = `${alias}_${startblock}_${endblock}_${i}.csv`;
                const fpath = `${dir}/${fname}`;

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
            logger.error(`An error occurred on data persisting for ${alias} contract: ${err}`);
        }
    });
};

module.exports = {
    validateContractAddress,
    getTxInfo,
    getCreatedContracts,
    getAbisAndDecoders,
    revealTxsData,
    getFeatures,
    persistTxsData
};
