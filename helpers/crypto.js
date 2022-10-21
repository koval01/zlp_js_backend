import crypto from "crypto";
import {crypto_keys} from "../vars";
import {get_current_server_time, get_user_ip} from "./methods";

function decrypt(data) {
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

function encryptor(data) {
    let cipher = crypto.createCipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
    let encryptedData = cipher.update(data, "utf-8", "base64")
    encryptedData += cipher.final("base64")
    return encryptedData
}

function crypto_check(req, resp, next) {
    let decryptedData = decrypt(req.body.crypto_token)

    if (decryptedData) {
        let body = JSON.parse(decryptedData)
        if (body.ip === get_user_ip(req) && (get_current_server_time() - body.timestamp) < 900) {
            return next()
        }
    }
    return resp.status(403).json({
        success: false,
        message: 'Security error',
        exception: 'error verify crypto token'
    })
}

module.exports.crypto_view = async (req, resp) => {
    return resp.send({
        success: true, token: encryptor(JSON.stringify({
            ip: get_user_ip(req),
            timestamp: get_current_server_time()
        }))
    })
}