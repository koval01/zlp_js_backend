const axios = require("axios")

const getAuthToken = async () => {
    return await axios.post(
        'https://panel.zalupa.online/auth/login',
        JSON.parse(process.env.PUFFER_AUTH)
    )
}

const sendCommandToConsole = async (command) => {
    const token = await getAuthToken().data.session
    try {
        return await axios.post(
            `https://panel.zalupa.online/proxy/daemon/server/${process.env.PUFFER_SERVER}/console`,
            JSON.stringify(`{${command}:""`), {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })
    } catch (err) {
        return !!err.response
    }
}

module.exports = {
    getAuthToken, sendCommandToConsole
}