const {main_e} = require("./errors")
const axios = require("axios")
const Redis = require("ioredis")
const {b64_to_utf8} = require("./methods")
const {getSkins} = require("../database/functions/skins")

const redis = new Redis(process.env.REDIS_URL)

const buildSkinsResponse = async (json_body, callback) => {
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

    const getUUID = async (player_name) => {
        const data = await axios.get(
            `https://api.mojang.com/users/profiles/minecraft/${player_name}`
        ).data
        if (data) {
            console.log(`getUUID : ${JSON.stringify(data)}`)
            return data.id
        }
    }

    const getSkinValue = async (player_name) => {
        const uuid = await getUUID(player_name)
        const data = await axios.get(
            `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
        ).data
        if (data) {
            console.log(`getSkinValue : ${JSON.stringify(data)}`)
            return data.properties.value
        }
    }

    const getMojangSkin = async (player_name) => {
        const value = await getSkinValue(player_name)
        if (!value) {
            return
        }
        return JSON.parse(b64_to_utf8(value))
    }

    const getTextureID = (skins) => {
        let result = []
        for (let skin of skins) {
            const texture = JSON.parse(b64_to_utf8(skin["Value"]))

            result.push({
                Nick: skin["Nick"],
                Value: (texture["textures"]["SKIN"]["url"])
                    .replace("http://textures.minecraft.net/texture/", "")
            })
        }
        return result
    }

    const loadMojangSkins = async (players_array, ordered_skins) => {
        let result = players_array
        for (let player_iter of json_body.players) {
            if (!ordered_skins.includes(player_iter)) {
                const skin = await getMojangSkin(player_iter["Nick"])
                if (skin) {
                    result.push(
                        getTextureID(skin)[0]
                    )
                }
            }
        }
        return result
    }

    await redis.get("skins_data", async (error, result) => {
        if (error) {
            callback(null)
        }
        if (result !== null) {
            callback({data: JSON.parse(result), cache: true})
        } else {
            console.log(`Ordered player list for skins get : ${JSON.stringify(json_body.players)}`)
            await getSkins(async function (body_data) {
                let ordered_skins = []
                for (let skin_local of body_data) {
                    ordered_skins.push(skin_local["Nick"])
                }

                body_data = getTextureID(body_data)
                body_data = await loadMojangSkins(body_data, ordered_skins)
                redis.set(
                    "skins_data",
                    JSON.stringify(body_data),
                    "ex", 15)
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

        await buildSkinsResponse(req.body, function (data) {
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