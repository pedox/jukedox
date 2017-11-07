import queryString from 'query-string'

class Api {

    constructor() {

    }

    get(endpoint, params = {}) {
        return fetch(`/api/${endpoint}?${queryString.stringify(params)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })
        .then((response) => response.json())
    }

    post(endpoint, body = {}, params = {}) {
        return fetch(`/api/${endpoint}?${queryString.stringify(params)}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        })
        .then((response) => response.json())
    }
}


export default Api