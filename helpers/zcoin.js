const axios = require("axios")

const verifyResponse = async (resp) => {
    if (!!resp.data.success) {
        return resp.data.result
    }
}

const getCurrentPrice = async () => {
    return await verifyResponse(
        await axios.get(
            'http://127.0.0.1:3812/api/current',
        )
    )
}

const getHistoryPrice = async () => {
    return await verifyResponse(
        await axios.get(
            'http://127.0.0.1:3812/api/history',
        )
    )
}

module.exports = {
    getCurrentPrice,
    getHistoryPrice
}