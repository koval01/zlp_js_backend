const { getHead64 } = require("../helpers/profile")
const { getVerifiedTelegramData } = require("../../telegram")

module.exports.getHead = async (req, res) => {
    console.log("pos 1")
    // const tg_user = getVerifiedTelegramData(req.params.tg_auth, custom_var=true)
    // if (!tg_user) {
    //     return res.status(400)
    // }

    console.log("pos 2")
    // const texture = req.params.texture_hash;
    const texture = "c7acd6b5a7a61bb25892225d160138b4e97fa02cc33fbecb559deae4cb485f" // for test
    const width = Numbers.getPositive(req.options.width, 80);
    const height = Numbers.getPositive(req.options.height, 80);

    if (width > 250 || height > 250) {
        return res.status(400)
    }

    console.log("pos 3")

    let head64 = await getHead64(texture, width, height, req.options.overlay);

    console.log("pos 4")
    head64 = head64.substr(head64.indexOf(",") + 1);

    console.log("pos 5")
    if (req.options.base64) {
        return res.send(head64);
    }

    console.log("pos 6")
    const head = Buffer.from(head64, "base64");

    console.log("pos 7")
    res.set("Content-Type", "image/png");
    return res.send(head);
};