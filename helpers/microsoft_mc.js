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

const responseMicrosoft = async (req, resp) => {
    const json_body = req.body
    const response = await getGameOwnership(json_body.token)
    return resp.json(response.data)
}

module.exports = {
    responseMicrosoft
}