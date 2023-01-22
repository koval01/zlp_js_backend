const {sql_request} = require("../mysql")
const {getTextureID} = require("../../helpers/skins")
const {token} = require("mysql/lib/protocol/Auth");

const check_telegram = (callback, telegram_id, nickname=null) => {
    sql_request(function (data) {
            console.log(`Get Telegram player : ${JSON.stringify(data)}`)
            callback(data)
        },
        "limboauth",
        "SELECT LOWERCASENICKNAME, TELEGRAM_ID FROM `SOCIAL` WHERE `TELEGRAM_ID` = ? OR `LOWERCASENICKNAME` = ?",
        [telegram_id, nickname.toLowerCase()]
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

const get_private_server = (callback, nickname) => {
    sql_request(function (data) {
            console.log(`Get player from Vanilla whitelist : ${JSON.stringify(data)}`)
            callback(data)
        },
        "WhitelistVanilla",
        "SELECT * FROM `whitelist` WHERE `user` = ?", // OLD: "SELECT * FROM `whitelist` WHERE `user` = ? and `UUID` = ?"
        [nickname]
    )
}

const get_player_tokens = (callback, nickname, uuid) => {
    sql_request(function (data) {
            console.log(`Get player tokens : ${JSON.stringify(data)}`)
            callback(data)
        },
        "xconomy",
        "SELECT UID, player, balance FROM `xconomy` WHERE `player` = ? AND `UID` = ?",
        [nickname, uuid]
    )
}

const get_player_auth = (callback, telegram_id) => {
    check_telegram(function (data) {
        if (data.length) {
            const lower_nick = data[0]["LOWERCASENICKNAME"]
            get_player(function (data_0) {
                let player = data_0[0]
                get_skin(function (skin) {
                    try {
                        player["SKIN"] = getTextureID(skin[0].Value, true)["Value"]
                    } catch (_) {
                        player["SKIN"] = "31f477eb1a7beee631c2ca64d06f8f68fa93a3386d04452ab27f43acdf1b60cb" // Steve
                    }
                    player["PREMIUM"] = !!player["PREMIUMUUID"].length
                    delete player["PREMIUMUUID"]
                    get_private_server(function (private_) {
                        player["PRIVATE_SERVER"] = !!(private_ && private_.length)
                        get_player_tokens(function (tokens_balance) {
                            player["BALANCE"] = tokens_balance ? parseInt(tokens_balance[0]["balance"]) : 0
                            callback(player)
                        }, player["NICKNAME"], player["UUID"])
                    }, player["NICKNAME"])
                }, lower_nick)
            }, lower_nick)
        } else {
            callback(null)
        }
    }, telegram_id)
}

module.exports = {
    get_player_auth,
    check_telegram
}