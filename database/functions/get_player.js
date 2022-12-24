const {sql_request} = require("../mysql")

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

    check_telegram(function (data) {
        console.log(`check_telegram in get_player_auth : ${data}`)
        if (data.length) {
            callback(data)
        } else if (invite_id !== null) {
            insert()
            callback(null)
        } else {
            callback(null)
        }
    })
}

module.exports = {
    get_player_auth
}