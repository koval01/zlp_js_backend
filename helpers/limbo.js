const siphash24 = require('siphash24')
const struct = require('python-struct')
const crypto = require('crypto')

const getUUID = (rawUUID) => {
    return [...rawUUID.matchAll(
        /([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})/g
    )][0].slice(1,).join("-")
}

const generateSiphash = (player_username) => {
    const verify_key = process.env.LIMBO_KEY
    const key = crypto.createHash('md5').update(verify_key).digest('hex')
    const issue_timestamp = Date.now()

    const username_bytes = Buffer.from(player_username.toLowerCase(), 'utf-8').toString()
    const timestamp_bytes = struct.pack(">Q", issue_timestamp)

    const tokenhash = siphash24(username_bytes+timestamp_bytes, key)

    return Buffer.concat([timestamp_bytes, tokenhash]).toString("base64")
}

module.exports = {
    generateSiphash,
    getUUID
}