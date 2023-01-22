const siphash24 = require('siphash24')
const struct = require('python-struct')
const crypto = require('crypto')
const {utf8_to_b64} = require('./methods')

const generateSiphash = (player_username) => {
    const verify_key = "testkey8384398"
    const key = crypto.createHash('md5').update(verify_key).digest('hex')
    const issue_timestamp = Date.now() / 1000

    const username_bytes = Buffer.from(player_username.toLowerCase(), 'utf-8').toString()
    const timestamp_bytes = struct.pack(">Q", issue_timestamp)

    const tokenhash = siphash24(username_bytes+timestamp_bytes, key)
    const hash_bytes = struct.pack(">Q", tokenhash)

    return utf8_to_b64(timestamp_bytes.join(hash_bytes))
}

module.exports = {
    generateSiphash
}