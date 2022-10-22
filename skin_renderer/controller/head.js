const {getHead64} = require("../helpers/profile")
const Numbers = require("../helpers/numbers")
const {getVerifiedTelegramData} = require("../../helpers/telegram/base")

module.exports.getHead = async (req, res) => {
    const tg_user = getVerifiedTelegramData(req.query.tg_auth, true)
    if (!tg_user) {
        return res.status(400).send(null)
    }

    const texture = req.query.texture_hash
    let width = Numbers.getPositive(req.query.width ? parseInt(req.query.width) : null, 80)
    const height = Numbers.getPositive(null, 80)

    width > 200 ? width = 200 : null

    let head64 = await getHead64(texture, width, height, req.query.overlay)

    head64 = head64.substr(head64.indexOf(",") + 1)

    if (req.query.base64) {
        return res.send(head64)
    }

    const head = Buffer.from(head64, "base64")

    res.set("Content-Type", "image/png")
    return res.send(head)
}