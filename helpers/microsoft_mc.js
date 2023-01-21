const axios = require("axios")
const {input_e} = require("./errors")
const Redis = require("ioredis")
const {generateSiphash} = require("./limbo")

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
            let games = await getGameOwnership(token)
            games = games.data
            if (!checkGames(games)) {
                return input_e(resp, 500, "error check game ownership")
            }

            let profile = await getMinecraftProfile(token)
            profile = profile.data
            if (!checkProfile(profile)) {
                return input_e(resp, 500, "error check minecraft profile")
            }

            const result_response = {
                games: games, profile: profile, siphash: generateSiphash(profile.name)
            }

            redis.set(redis_token, JSON.stringify(result_response), "ex", 60)
            return response_call(result_response, true)
        }
    })
}

module.exports = {
    responseMicrosoft
}