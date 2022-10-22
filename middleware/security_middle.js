const request = require("request")
const {checkTelegramAuthorization} = require("../helpers/telegram/base")

function re_check(req, resp, next) {
    request(
        {
            uri: "https://www.google.com/recaptcha/api/siteverify",
            method: 'POST',
            form: {
                'secret': process.env.RE_TOKEN,
                'response': req.body.token
            }
        },
        (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                if (body.success) {
                    return next()
                }
            }
            return resp.status(403).json({
                success: false,
                message: 'Security error',
                exception: 'error verify recaptcha token'
            })
        }
    )
}

function tg_check(req, resp, next) {
    let auth_data = req.body.tg_auth_data
    let errro_msg = 'Telegram auth verification error'
    if (!auth_data) {
        return resp.status(400).json({
            success: false,
            message: errro_msg,
            exception: 'need field tg_auth_data'
        })
    }

    try {
        auth_data = JSON.parse(Buffer.from(auth_data, 'base64'))
    } catch (_) {
        return resp.status(503).json({
            success: false,
            message: errro_msg,
            exception: 'field tg_auth_data not valid'
        })
    }

    if (checkTelegramAuthorization(auth_data)) {
        return next()
    }
    return resp.status(403).json({
        success: false,
        message: 'Security error',
        exception: 'error verify Telegram auth data'
    })
}

module.exports = {
    re_check,
    tg_check
}