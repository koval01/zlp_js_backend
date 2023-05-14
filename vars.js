const crypto = require('crypto'),

    secrets = JSON.parse(process.env.MONITORING_SECRETS),
    crypto_keys = {
        init_vector: crypto.randomBytes(16),
        security_key: crypto.randomBytes(32)
    }


module.exports = {
    secrets, crypto_keys
}