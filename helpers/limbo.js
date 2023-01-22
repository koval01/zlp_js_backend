const siphash24 = require('siphash24')
const struct = require('python-struct')
const crypto = require('crypto')
const {utf8_to_b64} = require('./methods')

const ab2str = (buf) => {
    return String.fromCharCode.apply(null, new Uint16Array(buf))
}

const getUUID = (rawUUID) => {
    return [...rawUUID.matchAll(
        /([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})/g
    )][0].slice(1,).join("-")
}

const generateSiphash = (player_username) => {
    const verify_key = "testkey8384398"
    const key = crypto.createHash('md5').update(verify_key).digest('hex')
    const issue_timestamp = Date.now()

    const username_bytes = Buffer.from(player_username.toLowerCase(), 'utf-8').toString()
    const timestamp_bytes = struct.pack(">Q", issue_timestamp)

    const tokenhash = siphash24(username_bytes+timestamp_bytes, key)

    return utf8_to_b64(ab2str(timestamp_bytes.join(tokenhash)))
}

module.exports = {
    generateSiphash,
    getUUID
}