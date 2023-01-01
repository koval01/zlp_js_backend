const crypto = require("crypto")
const {crypto_keys} = require("../vars")
const {get_current_server_time, get_user_ip} = require("./methods")

const decrypt = (data) => {
    try {
        let decipher = crypto.createDecipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
        let decryptedData = decipher.update(data, "base64", "utf-8")

        decryptedData += decipher.final("utf8")

        if (decryptedData) {
            return decryptedData
        }
    } catch (_) {
    }
}

const encryptor = (data) => {
    let cipher = crypto.createCipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
    let encryptedData = cipher.update(data, "utf-8", "base64")
    encryptedData += cipher.final("base64")
    return encryptedData
}

const crypto_check_logic = (token, req) => {
    try {
        let decryptedData = decrypt(token)

        if (decryptedData) {
            let body = JSON.parse(decryptedData)
            if (body.ip === get_user_ip(req) && (get_current_server_time() - body.timestamp) < 300) {
                return true
            }
        }
        return false
    } catch (_) {
        return false
    }
}

const crypto_check_raw = (req, resp, next, mode = "POST") => {
    let token = req.body.crypto_token
    if (mode === "GET") {
        token = req.query.crypto_token
    }
    // console.log(`crypto_check_raw ${mode} : ${token}`)
    const check = crypto_check_logic(token, req)
    if (check) {
        return next()
    }
    return resp.status(403).json({
        success: false,
        message: 'Security error',
        exception: 'error verify crypto token'
    })
}

const check_service_token = (req, resp, next) => {
    if (req.body.service_token === process.env.SERVICE_TOKEN) {
        return next()
    }
    return resp.status(403).json({
        success: false,
        message: 'Security error',
        exception: 'error verify service token'
    })
}

const crypto_check = (req, resp, next) => {
    return crypto_check_raw(req, resp, next)
}

const crypto_check_get = (req, resp, next) => {
    return crypto_check_raw(req, resp, next, "GET")
}

const crypto_view_ = async (req, resp) => {
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