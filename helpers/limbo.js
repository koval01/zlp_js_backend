const siphash24 = require('siphash24')
const struct = require('python-struct')
const {utf8_to_b64} = require('./methods')

const generateSiphash = (player_username) => {
    const verify_key = "testkey123"
    const issue_timestamp = Date.now() / 1000

    const username_bytes = Buffer.from(player_username.toLowerCase(), 'utf-8').toString()
    const timestamp_bytes = struct.pack(">Q", issue_timestamp)

    let tokenhash = siphash24(verify_key)
    tokenhash.update(username_bytes)
    tokenhash.update(timestamp_bytes)
    tokenhash = tokenhash.hash()
    const hash_bytes = struct.pack(">Q", tokenhash)

    return utf8_to_b64(timestamp_bytes.join(hash_bytes))
}

module.exports = {
    generateSiphash
}