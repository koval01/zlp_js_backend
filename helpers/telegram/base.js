const crypto = require('crypto')
const request = require("request");
const qs = require("querystring");
const {input_e, main_e} = require("../errors");
const {get_player_auth} = require("../../database/functions/get_player");

const getTelegramValidateHash = (authData) => {
    const tgBotToken = process.env.BOT_TOKEN
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

const createInviteLinkPrivateChat = (callback) => {
    request(
        {
            uri: `https://api.telegram.org/bot${
                process.env.BOT_TOKEN
            }/createChatInviteLink?chat_id=${
                process.env.PRIVATE_CHAT_ID
            }&member_limit=1`,
            method: 'GET'
        },
        (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                if (body.ok) {
                    callback(body.result)
                }
            }
        }
    )
}

const getVerifiedTelegramData = (json_body, custom_var = false) => {
    let authData
    if (custom_var) {
        authData = json_body
    } else {
        authData = json_body.tg_auth_data
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

const tg_check_view = async (req, res) => {
    const authData = getVerifiedTelegramData(req.body)
    function response_call(result, cache = false) {
        return res.send({
            success: true,
            cache: cache,
            player_data: result
        })
    }

    try {
        get_player_auth(function (data) {
            if (!data) {
                return input_e(res, 200, "not found user in social-bot database")
            }
            return response_call(data, false)
        }, authData.id)
    } catch (e) {
        console.error(e)
        return input_e(res, 503, "database error")
    }
}

module.exports = {
    getTelegramValidateHash,
    checkTelegramAuthorization,
    createInviteLinkPrivateChat,
    getVerifiedTelegramData,
    tg_check_view
}