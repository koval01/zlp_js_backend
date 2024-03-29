const crypto = require("crypto"), {crypto_keys} = require("../vars"), {
    get_current_server_time,
    get_user_ip
} = require("./methods"),
    // start context
decrypt = (data) => {
    try {
        let decipher = crypto.createDecipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
        let decryptedData = decipher.update(data, "base64", "utf-8")

        decryptedData += decipher.final("utf8")

        if (decryptedData) {
            return decryptedData
        }
    } catch (_) {
    }
}, encryptor = (data) => {
    let cipher = crypto.createCipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
    let encryptedData = cipher.update(data, "utf-8", "base64")
    encryptedData += cipher.final("base64")
    return encryptedData
}, crypto_check_logic = (token, req) => {
    try {
        let decryptedData = decrypt(token)

        if (decryptedData) {
            let body = JSON.parse(decryptedData)
            if (body.ip === get_user_ip(req) && (get_current_server_time() - body.timestamp) < 60) {
                return true
            }
        }
        return false
    } catch (_) {
        return false
    }
}, crypto_check_raw = (req, resp, next, mode = "POST") => {
    let token = req.body["crypto_token"]
    if (mode === "GET") {
        token = req.query["crypto_token"]
    }

    const check = crypto_check_logic(token, req)
    if (check) {
        return next()
    }
    return resp.status(403).json({
        success: false,
        message: 'Security error',
        exception: 'error verify crypto token'
    })
}, check_service_token = (req, resp, next) => {
    return req.body["service_token"] === process.env.SERVICE_TOKEN
        ? next() : resp.status(403).json(
            {
                success: false,
                message: 'Security error',
                exception: 'error verify service token'
            })
}, crypto_check = (req, resp, next) => {
    return crypto_check_raw(req, resp, next)
}, crypto_check_get = (req, resp, next) => {
    return crypto_check_raw(req, resp, next, "GET")
}, crypto_view_ = async (req, resp) => {
    return resp.send({
        success: true, token: encryptor(JSON.stringify({
            ip: get_user_ip(req),
            timestamp: get_current_server_time(),
            salt: crypto.randomBytes(256)
        }))
    })
}


module.exports = {
    crypto_view_,
    crypto_check_logic,
    encryptor,
    decrypt,
    crypto_check,
    crypto_check_get,
    check_service_token
}