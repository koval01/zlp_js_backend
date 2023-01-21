const axios = require("axios")

const getGameOwnership = async (token) => {
    return await axios.get(
        'https://api.minecraftservices.com/entitlements/mcstore',
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )
}

const responseMicrosoft = async (token) => {
    const resp = await getGameOwnership(token)
    return resp.data
}

module.exports = {
    responseMicrosoft
}