const { getHead64 } = require("../helpers/profile")
const Numbers = require("../helpers/numbers")
const { getVerifiedTelegramData } = require("../../telegram")

module.exports.getHead = async (req, res) => {
    // const tg_user = getVerifiedTelegramData(req.query.tg_auth, custom_var=true)
    // if (!tg_user) {
    //     return res.status(400)
    // }

    const texture = req.query.texture_hash
    const width = Numbers.getPositive(req.query.width, 80);
    const height = Numbers.getPositive(req.query.height, 80);

    if (width > 250 || height > 250) {
        return res.status(400)
    }

    let head64 = await getHead64(texture, width, height, req.query.overlay);

    head64 = head64.substr(head64.indexOf(",") + 1);

    if (req.query.base64) {
        return res.send(head64);
    }

    const head = Buffer.from(head64, "base64");

    res.set("Content-Type", "image/png");
    return res.send(head);
};