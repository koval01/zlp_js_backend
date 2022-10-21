const crypto = require('crypto')

const monitoring_list = [
    {
        name: "minecraftrating.ru",
        permission: "monitoring_1",

    },
    {
        name: "monitoringminecraft.ru",
        permission: "monitoring_2",
    }
]
const secrets = JSON.parse(process.env.MONITORING_SECRETS)

const crypto_keys = {
    init_vector: crypto.randomBytes(16),
    security_key: crypto.randomBytes(32)
}

module.exports = {
    monitoring_list,
    secrets,
    crypto_keys
}