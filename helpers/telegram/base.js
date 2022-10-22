const crypto = require('helpers/crypto')

const getTelegramValidateHash = (authData) => {
    const tgBotToken = process.env.FEEDBACK_BOT_TOKEN
    delete authData.hash

    let key = crypto.createHash('sha256').update(tgBotToken).digest()
    let dataCheckArr = Object.keys(authData)
        .map((key) => `${key}=${authData[key]}`)
        .sort()
        .join("\n")

    return crypto.createHmac(
        'sha256', key)
        .update(dataCheckArr)
        .digest('hex')
}

const checkTelegramAuthorization = (authData) => {
    return authData.hash === getTelegramValidateHash(authData)
}

const getVerifiedTelegramData = (json_body, custom_var = false) => {
    let authData
    if (custom_var) {
        authData = json_body
    } else {
        json_body.tg_auth_data
    }
    try {
        authData = JSON.parse(Buffer.from(authData, 'base64'))
    } catch (_) {
        return
    }
    if (checkTelegramAuthorization(authData)) {
        return authData
    }
}

const tg_check_view = async (_, resp) => {
    return resp.send({success: true})
}

module.exports = {
    getTelegramValidateHash,
    checkTelegramAuthorization,
    getVerifiedTelegramData,
    tg_check_view
}