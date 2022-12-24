const {sql_request} = require("../mysql")
const {getTextureID} = require("../../helpers/skins")

function get_player_auth(callback, telegram_id) {
    let check_telegram = (callback) => {
        sql_request(function (data) {
                console.log(`Get Telegram player : ${JSON.stringify(data)}`)
                callback(data)
            },
            "limboauth",
            "SELECT LOWERCASENICKNAME, TELEGRAM_ID FROM `SOCIAL` WHERE `TELEGRAM_ID` = ?",
            [telegram_id]
        )
    }
    const get_player = (callback, lower_player) => {
        sql_request(function (data) {
                console.log(`Get player by lowercase nickname : ${JSON.stringify(data)}`)
                callback(data)
            },
            "limboauth",
            "SELECT NICKNAME, LOWERCASENICKNAME, REGDATE, UUID, PREMIUMUUID FROM `AUTH` WHERE `LOWERCASENICKNAME` = ?",
            [lower_player]
        )
    }

    const get_skin = (callback, lower_player) => {
        sql_request(function (data) {
                console.log(`Get player skin by lowercase nickname : ${JSON.stringify(data)}`)
                callback(data)
            },
            "Skins",
            "SELECT Nick, Value FROM `Skins` WHERE `Nick` = ?",
            [lower_player]
        )
    }

    check_telegram(function (data) {
        console.log(`check_telegram in get_player_auth : ${data}`)
        if (data.length) {
            const lower_nick = data[0]["LOWERCASENICKNAME"]
            get_player(function (data_0) {
                let player = data_0[0]
                get_skin(function (skin) {
                    player["SKIN"] = getTextureID(skin[0].Value, true)
                    callback(player)
                }, lower_nick)
            }, lower_nick)
        } else {
            callback(null)
        }
    })
}

module.exports = {
    get_player_auth
}