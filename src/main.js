import { createWriteStream } from 'fs';
import { parseAsync } from 'json2csv';
import Listr from 'listr';
import { MongoClient } from 'mongodb';
import {observable, Observable} from 'rxjs';
import {
    HttpRequestMethod,
    apiHttpRequest
} from './utils';

const ethApiUrl = 'https://api.etherscan.io/api';
const ethRopstenApiUrl = 'https://api-ropsten.etherscan.io/api';

// MongoDB parameters
const url = 'mongodb://localhost:27017';
const dbName = 'gasStats';
const collectionName = 'gasUsed';
let db = false;
let docs = false;

export const getGasStats = async (options) => {
    this.txs = [];

    if (!options.address) {
        console.error('Smart contract address is not specified!');
        return;
    }

    const tasks = new Listr([
        {
            title: 'Connecting to MongoDB',
            task: () => {
                return connectToDB(options);
            },
            enabled: () => options.mongo
        },
        {
            title: 'Fetching transactions',
            task: async () => {
                return getTxInfo.call(this, options);
            }
        },
        {
            title: 'Preparing data',
            task: async () => {
                return prepareTxsData.call(this, options);
            }
        },
        {
            title: 'Persisting data',
            task: async () => {
                return persistTxsData.call(this, options);
            }
        },
        {
            title: 'Getting stats',
            task: async () => {
                return aggregateData(options)
            },
            enabled: () => options.mongo
        }
    ]);

    tasks.run().then(async () => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1)
    });
};

const getTxInfo = async (options) => {
    const offset = 200;
    return new Observable( async (observer) => {
        let apiUrl = options.ropsten ? ethRopstenApiUrl: ethApiUrl;
        let pathParams = [];
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

            this.txs = this.txs.concat(response.result);
            observer.next(this.txs.length);
            ++params.page;

        } while (next);

        this.txs = this.txs.filter((tx) => undefined !== tx.to && tx.to.toLowerCase() === options.address.toLowerCase());

        observer.complete();
    });
};

const connectToDB = async (options) => {
    return new Observable( async (observer) => {
        observer.next('Connecting to DB');
        MongoClient.connect(url,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            },
            async (err, client) => {
                if (err) {
                    console.log(err);
                    return false;
                }
                db = client.db(dbName);

                const query = {to: options.address};

                await db.collection(collectionName).deleteMany(query);

                observer.next('Connected!');
                observer.complete();
            });
    })
};

const prepareTxsData = async function (options) {

};

const persistTxsData = async function (options) {
    return new Observable( async (observer) => {
        if (!this.txs.length) {
            observer.complete();
        }

        observer.next('Starting to persist transactions\' data');
        if (options.mongo) {
            this.txs.forEach(function(tx) {
                tx.gasUsed = Number(tx.gasUsed);
            });
            await db.collection(collectionName).insertMany(this.txs);
            observer.next('Done!');
            observer.complete();
        } else {
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
                'hash',
                {
                    label: 'timeStamp',
                    value: (row, field) => Number(row[field.label]),
                    default: 'NULL'
                }
            ];
            const opts = { fields };
            let promises = [];

            try {
                const chunk = 1000;
                const quantity = Math.ceil(this.txs.length / chunk);
                for (let i = 0; i < quantity; ++i) {
                    const ttxs = this.txs.slice(i * chunk, (i + 1) * chunk);

                    const fname = `${options.address}_${i}.csv`;
                    const fpath = `${options.path ? options.path : process.cwd()}/${fname}`;

                    promises.push(new Promise((resolve, reject) => parseAsync(ttxs, opts)
                        .then(async (csv) => {
                            let writeStream = createWriteStream(fpath);
                            writeStream.write(csv, 'utf-8');

                            writeStream.on('finish', () => {
                                observer.next(`${fname}: done!`);
                                resolve();
                            });

                            writeStream.end();
                        })
                        .catch(err => {
                            reject(`An error occurred on txs data processing to csv: ${err}; file: ${fpath}`);
                        })));

                    Promise.all(promises).then(() => {
                        observer.complete();
                    }).catch((err) => {
                        observer.error(new Error(`An error occurred on txs' data processing to csv: ${err}`));
                    })
                }
            } catch (err) {
                observer.error(new Error(`An error occurred on data persisting: ${err}`));
            }
        }
    });
};

const aggregateData = async (options) => {
    return new Observable( async (observer) => {
        observer.next('Calculating');
        db.collection(collectionName).aggregate([
            {
                $match:
                    {
                        "to": options.address
                    }
            },
            {
                $group:
                    {
                        _id: '$to',
                        sum: {$sum: '$gasUsed'},
                        avg: {$avg: '$gasUsed'},
                        max: {$max: '$gasUsed'},
                        min: {$min: '$gasUsed'}
                    }
            }
        ]).toArray(function (err, _docs) {
            if (err) {
                observer.next(`Error: ${err}`);
                observer.complete();
                return;
            }

            observer.next('Done!');
            observer.complete();

            docs = _docs;
        });
    })
};
