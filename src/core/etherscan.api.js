const { HttpRequestMethod } = require('./enums');
const { apiHttpRequest } = require('../utils');

const apiUrls = {
    mainnet: 'https://api.etherscan.io/api',
    ropsten: 'https://api-ropsten.etherscan.io/api',
    kovan: 'https://api-kovan.etherscan.io/api',
    rinkeby: 'https://api-rinkeby.etherscan.io/api',
    goerli: 'https://api-goerli.etherscan.io/api'
};

const apikey = 'NGU6TY7RCXUTNM6SJA27721VV4V71TE4WW';

const getSourceCode = async (address, options) => {
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
    const pathParams = [];
    const queryParams = {
        module: 'contract',
        action: 'getsourcecode',
        address,
        apikey,
    };
    const method = HttpRequestMethod.GET;
    const response = await apiHttpRequest({
        apiUrl,
        pathParams,
        queryParams,
        method
    });
    return response;
};

const getTxInfo = async (address, options, internal = false) => {
    let txs = [];
    const offset = 200;
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
    const pathParams = [];
    let queryParams = {
        module: 'account',
        action: internal ? 'txlistinternal' : 'txlist',
        address,
        startblock: options.startblock,
        endblock: options.endblock,
        sort: 'asc',
        page: 1,
        offset,
        apikey,
    };
    const method = HttpRequestMethod.GET;
    let next = false;
    do {
        const response = await apiHttpRequest({
            apiUrl,
            pathParams,
            queryParams,
            method
        });
        next = response.result.length === offset;
        txs = txs.concat(response.result);
        ++queryParams.page;
    } while (next);
    return txs;
};

const validateContractAddress = async (address, options) => {
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
    const pathParams = [];
    const queryParams = {
        module: 'proxy',
        action: 'eth_getCode',
        address,
        apikey,
    };
    const method = HttpRequestMethod.GET;
    const response = await apiHttpRequest({
        apiUrl,
        pathParams,
        queryParams,
        method
    });
    return response;
};

module.exports = {
    validateContractAddress,
    getTxInfo,
    getSourceCode,
};
