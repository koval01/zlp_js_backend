const {sql_request} = require("../mysql")

function promotions_sql(resp, body, stat, permission_ident) {
    sql_request(function (result) {
            let error = () => resp.send("Ошибка базы данных")
            let no_player = () => resp.send("Игрок не найден")
            if (!result) {
                return error()
            } else if (!result.length) {
                return no_player()
            } else if (!result[0].uuid) {
                return no_player()
            } else {
                let add_permission = () => {
                    sql_request(function (insert_result) {
                            if (insert_result) {
                                stat()
                                console.log(`Result insert to luckperms : ${JSON.stringify(insert_result)}`)
                                return resp.send("ok")
                            }
                            return error
                        },
                        "INSERT luckperms_user_permissions (uuid, permission, value, server, world, expiry, contexts) VALUES (?, ?, 1, 'global', 'global', '0', '{}')",
                        [result[0].uuid, permission_ident]
                    )
                }
                let update_permission = () => {
                    sql_request(function (update_result) {
                            if (update_result) {
                                stat()
                                console.log(`Result update row in luckperms : ${JSON.stringify(update_result)}`)
                                return resp.send("ok")
                            }
                            return error
                        },
                        "UPDATE luckperms_user_permissions SET `value` = 1 WHERE `uuid` = ? AND `permission` = ? ORDER BY id DESC LIMIT 1",
                        [result[0].uuid, permission_ident]
                    )
                }
                sql_request(function (permission) {
                        if (!permission.length) {
                            return add_permission()
                        } else if (parseInt(permission[0].value) !== 1) {
                            return update_permission()
                        } else if (parseInt(permission[0].value) === 1) {
                            return resp.send("Право уже выдано")
                        }
                        return resp.send("Неизвестная ошибка")
                    },
                    "SELECT `uuid`, `permission`, `value` FROM luckperms_user_permissions WHERE `uuid` = ? AND `permission` = ? ORDER BY id DESC LIMIT 1",
                    [result[0].uuid, permission_ident]
                )
            }
            return error
        },
        "SELECT `uuid` FROM `luckperms_players` WHERE `username` = ?",
        [body.username]
    )
}

module.exports = {
    promotions_sql
}