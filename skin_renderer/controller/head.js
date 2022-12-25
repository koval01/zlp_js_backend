const {getHead64} = require("../helpers/profile")
const {input_e} = require("../../helpers/errors")
const Numbers = require("../helpers/numbers")
const {getVerifiedTelegramData} = require("../../helpers/telegram/base")

module.exports.getHead = async (req, res) => {
    const tg_user = getVerifiedTelegramData(req.query.tg_auth, true)
    if (!tg_user) {
        return input_e(res, 403, "telegram auth invalid")
    }

    const texture = req.query.texture_hash
    let width = Numbers.getPositive(req.query.width ? parseInt(req.query.width) : null, 100)
    width > 250 ? width = 250 : null
    const height = parseInt(width)

    await getHead64(async function(head64) {
        console.log(head64)
        head64 = head64.substr(head64.indexOf(",") + 1)

        if (req.query.base64) {
            return res.send(head64)
        }

        const head = Buffer.from(head64, "base64")

        res.set("Content-Type", "image/png")
        return res.send(head)
    }, texture, width, height, req.query["overlay"])
}