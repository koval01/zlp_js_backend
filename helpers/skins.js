const {main_e} = require("./errors");
const request = require("request");
const Redis = require("ioredis")
const {getSkins} = require("../database/functions/skins")

const redis = new Redis(process.env.REDIS_URL)

const buildSkinsResponse = (json_body, callback) => {
    // function response_(data) {
    //     if (data) {
    //         let result = [];
    //         console.log(`payment_history array length : ${data.length}`)
    //         data = data.reverse();
    //         for (let i = 0; i < data.length; i++) {
    //             let p = data[i];
    //             let pi = p.products[0];
    //             if (p.status === 2 && result.length <= 30) {
    //                 result.push({
    //                     customer: p.customer,
    //                     created_at: p.created_at,
    //                     updated_at: p.updated_at,
    //                     product: {
    //                         name: pi.name,
    //                         image: pi.image
    //                     }
    //                 })
    //             }
    //         }
    //         return result;
    //     } else {
    //         return null
    //     }
    // }

    function getTextureID(skins) {
        let result = []
        for (let skin of skins) {
            const buff = new Buffer(skin["Value"], "base64")
            const text = buff.toString("ascii")

            console.log(`getTextureID (textures) : ${JSON.stringify(text["textures"])}`)
            result.push({
                Nick: skin["Nick"],
                Value: (text["textures"]["SKIN"]["url"])
                    .replace("http://textures.minecraft.net/texture/", "")
            })
        }
        return result
    }

    redis.get("skins_data", (error, result) => {
        if (error) {
            callback(null)
        }
        if (result !== null) {
            callback({data: JSON.parse(result), cache: true})
        } else {
            console.log(`Ordered player list for skins get : ${JSON.stringify(json_body.players)}`)
            getSkins(function (body_data) {
                body_data = getTextureID(body_data)
                redis.set(
                    "skins_data",
                    JSON.stringify(body_data),
                    "ex", 180)
                callback({data: body_data, cache: false})
            }, json_body.players)
        }
    })
}

const getSkinsData = async (req, resp) => {
    try {
        function response_call(result, cache = false) {
            return resp.send({
                success: true,
                cache: cache,
                skins: result
            })
        }

        buildSkinsResponse(req.body, function (data) {
            if (data) {
                return response_call(data.data, data.cache)
            }
        })
    } catch (_) {
        return main_e(resp)
    }
}

module.exports = {
    getSkinsData
}