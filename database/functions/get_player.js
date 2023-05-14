const {sql_request} = require("../mysql"), {generateHexID} = require("../../helpers/methods"),
    check_telegram = (callback, telegram_id, nickname = null) => {
        sql_request(function (data) {
                console.debug(`Get Telegram player : ${JSON.stringify(data)}`)
                callback(data)
            },
            "limboauth",
            "SELECT LOWERCASENICKNAME, TELEGRAM_ID FROM `SOCIAL` WHERE `TELEGRAM_ID` = ? OR `LOWERCASENICKNAME` = ?",
            [telegram_id, nickname ? nickname.toLowerCase() : null]
        )
    }, get_player = (callback, lower_player) => {
        sql_request(function (data) {
                console.debug(`Get player by lowercase nickname : ${JSON.stringify(data)}`)
                callback(data)
            },
            "limboauth",
            "SELECT NICKNAME, LOWERCASENICKNAME, UUID, PREMIUMUUID FROM `AUTH` WHERE `LOWERCASENICKNAME` = ?",
            [lower_player]
        )
    }, get_private_server = (callback, nickname) => {
        sql_request(function (data) {
                console.debug(`Get player from Vanilla whitelist : ${JSON.stringify(data)}`)
                callback(data)
            },
            "WhitelistVanilla",
            "SELECT * FROM `whitelist` WHERE `user` = ?",
            [nickname]
        )
    }, get_private_server_license = (callback, uuid) => {
        sql_request(function (data) {
                console.debug(`Get player from Vanilla whitelist : ${JSON.stringify(data)}`)
                callback(data)
            },
            "WhitelistVanilla",
            "SELECT * FROM `whitelist` WHERE `UUID` = ?",
            [uuid]
        )
    }, get_player_tokens = (callback, uuid) => {
        sql_request(function (data) {
                console.debug(`Get player tokens : ${JSON.stringify(data)}`)
                callback(data)
            },
            "Tokens",
            "SELECT uuid, points FROM `playerpoints_points` WHERE `uuid` = ?",
            [uuid]
        )
    }, get_player_auth = (callback, telegram_id) => {
        const _get_player_tokens = (player) => {
            get_player_tokens(function (tokens_balance) {
                    try {
                        player["BALANCE"] = tokens_balance ? parseInt(tokens_balance[0]["points"]) : 0
                    } catch (_) {
                        player["BALANCE"] = 0
                    }
                    callback(player)
                },
                player["UUID"])
        }

        const _get_private_server = (player) => {
            get_private_server(function (private_) {
                    player["PRIVATE_SERVER"] = !!(
                        typeof private_ !== 'undefined' && private_.length
                    )
                    _get_player_tokens(player)
                },
                player["NICKNAME"])
        }

        const _get_player = (lower_nick, data) => {
            get_player(function (data_0) {
                if (!data || !data_0.length) {
                    callback(null)
                    return
                }
                let player = data_0[0]
                player["PREMIUM"] = !!(
                    typeof player["PREMIUMUUID"] !== 'undefined'
                    && player["PREMIUMUUID"].length
                )
                delete player["PREMIUMUUID"]
                delete player["LOWERCASENICKNAME"]

                _get_private_server(player)
            }, lower_nick)
        }

        check_telegram(function (data) {
            if (data.length) {
                _get_player(data[0]["LOWERCASENICKNAME"], data)
            } else {
                callback(null)
            }
        }, telegram_id)
    }


module.exports = {
    get_player_auth,
    check_telegram,
    get_private_server_license,
    get_player_tokens
}