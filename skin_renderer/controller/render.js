const { get3DHead, get3DSkin } = require("../helpers/profile")
const { getVerifiedTelegramData } = require("../../telegram")

module.exports.get3dHead = async (req, res) => {
    const texture = req.params.texture_hash

    const render = await get3DHead(texture)
    if (req.options.base64) {
        res.send(render.toString("base64"))
        return
    }
    res.set("Content-Type", "image/png")
    res.send(render)
}

module.exports.get3dBody = async (req, res) => {
    const tg_user = getVerifiedTelegramData(req.query.tg_auth, custom_var=true)
    if (!tg_user) {
        return res.status(400).send(null)
    }

    const texture = req.params.texture_hash

    const render = await get3DSkin(texture)
    if (req.options.base64) {
        res.send(render.toString("base64"))
        return
    }
    res.set("Content-Type", "image/png")
    res.send(render)
}