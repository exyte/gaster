const { HttpRequestMethod } = require('./enums');
const { apiHttpRequest } = require('../utils');

const apiUrls = {
    mainnet: 'https://api.etherscan.io/api',
    ropsten: 'https://api-ropsten.etherscan.io/api',
    kovan: 'https://api-kovan.etherscan.io/api',
    rinkeby: 'https://api-rinkeby.etherscan.io/api',
    goerli: 'https://api-goerli.etherscan.io/api'
};

async function getContractCreationDate(options, address) {
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
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
    return response;
}

async function getAbi(address, options) {
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
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
    return response;
}

async function getTxInfo(address, options, internal = false) {
    let txs = [];
    const offset = 200;
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
    const pathParams = [];
    let params = {
        module: 'account',
        action: internal ? 'txlistinternal' : 'txlist',
        address,
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
        txs = txs.concat(response.result);
        ++params.page;
    } while (next);
    return txs;
}

async function validateContractAddress(address, options) {
    const apiUrl = options.net ? apiUrls[`${options.net}`] : apiUrls.mainnet;
    const pathParams = [];
    const params = {
        module: 'proxy',
        action: 'eth_getCode',
        address
    };
    const method = HttpRequestMethod.GET;
    const response = await apiHttpRequest({
        apiUrl,
        pathParams,
        params,
        method
    });
    return response;
}

module.exports = {
    validateContractAddress,
    getTxInfo,
    getAbi,
    getContractCreationDate
};
