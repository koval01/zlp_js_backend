const Jimp = require("jimp")
const {getPaymentData} = require("../donate")
const {months_list, rand_move} = require("../methods")
const {input_e} = require("../errors")
const {getPorfirevich} = require("../porfirevich")
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)

const giftItemsSet = (items, image, font) => {
    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        item.params.text = String(item.params.text)
        image.print(
            font, rand_move(item.x), rand_move(item.y),
            item.params, image.getWidth()
        )
    }
}

const generateGiftPrivateServer = async (data, response) => {
    const image = await Jimp.read(__dirname + "/povestka.png")
    const font = await Jimp.loadFont(__dirname + "/B52.fnt")

    giftItemsSet([
        {x: 25, y: 360, params: {
            text: data.playername,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }
        },
        {x: 755, y: 480, params: {text: data.address}},
        {x: 1600, y: 830, params: {text: data.payment_id}},
        {x: 235, y: 1100, params: {text: data.date.day_month}},
        {x: 750, y: 1100, params: {text: data.date.year_last}},
        {x: 945, y: 1100, params: {text: data.date.hour}},
        {x: 360, y: 1330, params: {text: data.reason}},
        {x: 30, y: 2085, params: {
                text: data.publisher,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }
        }
    ], image, font)

    image.resize(image.bitmap.width / 2.4, image.bitmap.height / 2.4)

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
    redis.get(`gift_private_${json_body}`, (error, result) => {
        if (error) throw error
        if (result !== null) {
            return generateGiftPrivateServer(JSON.parse(result), res)
        } else {
            getPaymentData(json_body, async (data) => {
                data = data.data
                if (!data.product.name.toLowerCase().includes("проход")) {
                    return input_e(res, 400, "error service identify")
                }
                const date = new Date(data.created_at)
                const data_generator = {
                    payment_id: data.id,
                    playername: data.customer,
                    address: await getPorfirevich("Этот гражданин проживает в:"),
                    reason: await getPorfirevich(),
                    publisher: "Генерал-Полковник Пена Детров",
                    date: {
                        day_month: `${String(date.getDay())} ${months_list[date.getMonth() + 1]}`,
                        year_last: String(date.getFullYear()).slice(-2),
                        hour: String(date.getHours())
                    }
                }
                redis.set(`gift_private_${json_body}`, JSON.stringify(data_generator), "ex", 25)
                return generateGiftPrivateServer(data_generator, res)
            })
        }
    })
}

module.exports = {
    getGiftPrivateServer
}