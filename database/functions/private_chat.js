const {sql_request} = require("../mysql")

function private_chat_data(callback, username, invite_id=null) {
    let check_in_db = (callback) => {
        sql_request(function (data) {
                console.log(`Get private chat row : ${JSON.stringify(data)}`)
                callback(data)
            },
            "SELECT * FROM `private_chat_tg` WHERE `player_name` = ?",
            [username]
        )
    }
    const update = () => {
        sql_request(function (update_result) {
                console.log(`Update data for player in private chat row : ${JSON.stringify(update_result)}`)
                return update_result
            },
            "UPDATE `private_chat_tg` SET `invite_id` = ? WHERE `player_name` = ?",
            [invite_id, username]
        )
    }
    const insert = () => {
        sql_request(function (insert_result) {
                console.log(`Insert private chat row : ${JSON.stringify(insert_result)}`)
                return insert_result
            },
            "INSERT `private_chat_tg` (player_name, invite_id) VALUES (?, ?)",
            [username, invite_id]
        )
    }
    check_in_db(function (data) {
        if (data.length) {
            callback(data)
        } else if (invite_id !== null) {
            insert()
        }
    })
}

module.exports = {
    private_chat_data
}