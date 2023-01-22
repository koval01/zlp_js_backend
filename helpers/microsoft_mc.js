const axios = require("axios")
const {input_e} = require("./errors")
const Redis = require("ioredis")
const {generateSiphash} = require("./limbo")
const {check_telegram} = require("../database/functions/get_player")

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

            check_telegram(function (social_data) {
                const result_response = {
                    games: games, profile: profile,
                    siphash: generateSiphash(profile.name),
                    social: social_data.length ? social_data[0] : null
                }

                redis.set(redis_token, JSON.stringify(result_response), "ex", 30)
                return response_call(result_response, true)
            }, null, profile.name)
        }
    })
}

module.exports = {
    responseMicrosoft
}