const {get3DHead, get3DSkin} = require("../helpers/profile")
const {getVerifiedTelegramData} = require("../../helpers/telegram/base")
const {crypto_check_logic} = require("../../helpers/crypto")
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)

module.exports.get3dHead = async (req, res) => {
    const texture = req.query.texture_hash

    redis.get(`get3dHead_${texture}`, async (error, result) => {
        if (error) throw error
        if (result !== null) {
            res.set("Content-Type", "image/png")
            res.send(new Buffer(result).toString())
        } else {
            const render = new Buffer(await get3DHead(texture))
            const base = render.toString("base64")
            redis.set(`get3dHead_${texture}`, base, "ex", 30)
            if (req.query.base64) {
                res.send(base)
                return
            }
            res.set("Content-Type", "image/png")
            res.send(render)
        }
    })
}

module.exports.get3dBody = async (req, res) => {
    if (!crypto_check_logic(req.query.c_token, req)) {
        return res.status(400).send(null)
    }

    const tg_user = getVerifiedTelegramData(req.query.tg_auth, true)
    if (!tg_user) {
        return res.status(400).send(null)
    }

    const texture = req.query.texture_hash

    const render = new Buffer(await get3DSkin(texture))
    if (req.query.base64) {
        res.send(render.toString("base64"))
        return
    }
    res.set("Content-Type", "image/png")
    res.send(render)
}