const { get3DHead, get3DSkin } = require("../helpers/profile")
const { getVerifiedTelegramData } = require("../../helpers/telegram")

module.exports.get3dHead = async (req, res) => {
    const texture = req.query.texture_hash

    const render = new Buffer(await get3DHead(texture))
    if (req.options.base64) {
        res.send(render.toString("base64"))
        return
    }
    res.set("Content-Type", "image/png")
    res.send(render)
}

module.exports.get3dBody = async (req, res) => {
    const tg_user = getVerifiedTelegramData(req.query.tg_auth, true)
    if (!tg_user) {
        return res.status(400).send(null)
    }

    const texture = req.query.texture_hash

    const render = new Buffer(await get3DSkin(texture))
    if (req.options.base64) {
        res.send(render.toString("base64"))
        return
    }
    res.set("Content-Type", "image/png")
    res.send(render)
}