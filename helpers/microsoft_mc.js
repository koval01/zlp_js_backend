const axios = require("axios")
const {input_e} = require("../errors")
const {json} = require("express");

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

    const games = await getGameOwnership(token).data
    if (!checkGames(games)) {
        return input_e(resp, 500, "error check game ownership")
    }

    const profile = await getMinecraftProfile(token).data
    if (!checkProfile(profile)) {
        return input_e(resp, 500, "error check minecraft profile")
    }

    return resp.json({
        games: games, profile: profile
    })
}

module.exports = {
    responseMicrosoft
}