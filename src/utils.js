import fetch from 'node-fetch'

export const HttpRequestMethod = {
    GET: 'GET',
    POST: 'POST'
};

export const apiHttpRequest = async ({ apiUrl, pathParams = [], params: queryParams = {}, method }) => {
    let httpRequest;
    switch (method) {
        case HttpRequestMethod.GET:
            httpRequest = getAPI;
            break;
        case HttpRequestMethod.POST:
            httpRequest = postAPI;
            break;
        default:
            throw new Error('Error: unsupported API HTTP request');
    }
    return await httpRequest(apiUrl, pathParams, queryParams);
};

const getAPI = async (apiURL, pathParams, queryParams) => {
    const apiEndpoint = `${apiURL}/${pathParams.join('/')}`;
    const response =  await fetch(
        buildUrl(apiEndpoint, queryParams), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }
    ).catch((err) => {
        throw new Error(`Error (get API): ${err}, endpoint: ${apiEndpoint}`);
    });
    return await response.json();
};

const postAPI = async (apiURL, pathParams, queryParams) => {
    const apiEndpoint = `${apiURL}/${pathParams.join('/')}`;
    return await fetch(
        `${apiEndpoint}`, {
            method: 'POST',
            body: JSON.stringify(queryParams),
            headers: { 'Content-Type': 'application/json' }
        }
    ).catch((err) => {
        throw new Error(`Error (post API): ${err}, endpoint: ${apiEndpoint}`);
    });
};

function buildUrl(url, params) {
    let qs = '';
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            qs += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
        }
    }
    if (qs.length > 0) {
        qs = qs.substring(0, qs.length - 1); // chop off last "&"
        url = url + '?' + qs;
    }

    return url;
}
