const axios = require("axios")
const {input_e} = require("./errors")
const Redis = require("ioredis")
const {generateSiphash, getUUID} = require("./limbo")
const {check_telegram, get_private_server_license, get_player_tokens} = require("../database/functions/get_player")

const redis = new Redis(process.env.REDIS_URL)

const getGameOwnership = async (token) => {
    return await axios.get(
        'https://api.minecraftservices.com/entitlements/mcstore',
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )
}

const getMinecraftProfile = async (token) => {
    return await axios.get(
        'https://api.minecraftservices.com/minecraft/profile',
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )
}

const checkGames = (json_body) => {
    const items = json_body.items
    let checked = []

    for (let i = 0; i < items.length; i++) {
        const v = items[i]
        const vl = ["game_minecraft", "product_minecraft"]
        if (vl.includes(v.name) && v.signature) {
            checked.push(v.name)
        }
    }

    return checked.length === 2
}

const checkProfile = (json_body) => {
    return !!(json_body.id && json_body.name)

}

const responseMicrosoft = async (req, resp) => {
    const token = req.body.token
    const redis_token = `microsoft_jwt_${token}`

    const response_call = (data, cache = false) => {
        return resp.send({
            cache: cache,
            success: true,
            data: data
        })
    }

    redis.get(redis_token, async (error, result) => {
        if (error) throw error
        if (result !== null) {
            return response_call(JSON.parse(result), true)
        } else {
            const e_games = () => {
                return input_e(resp, 500, "error check game ownership")
            }

            let games
            try {
                const response = await getGameOwnership(token)
                games = response.data
                if (!checkGames(games)) {
                    return e_games()
                }
            } catch (_) {
                return e_games()
            }

            const e_profile = () => {
                return e_games()
            }

            let profile
            try {
                const response = await getMinecraftProfile(token)
                profile = response.data
                if (!checkProfile(profile)) {
                    return e_profile()
                }
            } catch (_) {
                return e_profile()
            }

            const UUID = getUUID(profile.id)

            check_telegram(function (social_data) {
                get_private_server_license(function (whitelistVanilla) {
                    get_player_tokens(function (xconomy) {
                        const result_response = {
                            games: games, profile: profile,
                            zalupa: {
                                siphash: generateSiphash(profile.name),
                                telegram_id: social_data.length ? social_data[0]["TELEGRAM_ID"] : null,
                                whitelistVanilla: !!whitelistVanilla.length,
                                balance: xconomy.length ? xconomy[0].balance : 0
                            }
                        }

                        redis.set(redis_token, JSON.stringify(result_response), "ex", 30)
                        return response_call(result_response, true)
                    }, profile.name, UUID)
                }, UUID)
            }, null, profile.name)
        }
    })
}

module.exports = {
    responseMicrosoft
}