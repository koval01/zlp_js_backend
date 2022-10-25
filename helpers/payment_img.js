const Jimp = require("jimp")
const {getPaymentData} = require("./donate")
const {input_e} = require("./errors")

const giftItemsSet = (items, image, font) => {
    for (let i = 0; i < items.length; i++) {
        image.print(
            font, items.x, rand_move(items.y),
            items.params, image.getWidth()
        )
    }
}

const generateGiftPrivateServer = async (data, response) => {
    const font = await Jimp.loadFont("B52.fnt")
    const image = await Jimp.read("povestka.png")

    giftItemsSet([
        {x: 25, y: 360, params: {
            text: data.playername,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }
        },
        {x: 755, y: 480, params: {text: data.address}},
        {x: 1600, y: 830, params: {text: data.payment_id}},
        {x: 230, y: 1100, params: {text: data.date.day_month}},
        {x: 750, y: 1100, params: {text: data.date.year_last}},
        {x: 945, y: 1100, params: {text: data.date.hour}},
        {x: 360, y: 1330, params: {text: data.reason}},
        {x: 30, y: 2085, params: {
                text: data.publisher,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }
        }
    ], image, font)

    const base64 = await image.getBase64Async(image.getMIME())
    const img = new Buffer.from(base64.replace(/^data:image\/png;base64,/, ''), 'base64')

    response.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length
    })
    return response.end(img)
}

const getGiftPrivateServer = async (req, res) => {
    const json_body = {
        payment_id: req.query.payment_id,
        tokens_send: true
    }
    getPaymentData(json_body, function (data) {
        data = data.data
        console.log(data)
        if (data.product[0].name.toLowerCase().includes("проход")) {
            return input_e(res, 400, "error service identify")
        }
        const data_generator = {
            payment_id: payment_id,
            playername: data.customer,
            address: "поле для адреса",
            reason: "поле для причины",
            publisher: "Генерал-Полковник Пена Детров",
            date: {
                day_month: "00 месяц",
                year_last: "22",
                hour: "15"
            }
        }
        return generateGiftPrivateServer(data_generator, res)
    })
}

module.exports = {
    getGiftPrivateServer
}