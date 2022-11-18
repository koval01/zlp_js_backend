const {sql_request} = require("../mysql")

function monitoring_statistic(monitoring_name, username) {
    let check_in_db = (callback) => {
        sql_request(function (data) {
                console.log(`Monitoring statistic select : ${JSON.stringify(data)}`)
                callback(data)
            },
            "monitoring_minecraftrating",
            "SELECT * FROM `monitoring_statistic` WHERE `username` = ? AND `monitoring` = ?",
            [username, monitoring_name]
        )
    }
    const update = () => {
        sql_request(function (update_result) {
                console.log(`Monitoring statistic update player : ${JSON.stringify(update_result)}`)
                return update_result
            },
            "monitoring_minecraftrating",
            "UPDATE monitoring_statistic SET `votes` = `votes` + 1, `timestep` = NOW() WHERE `username` = ? AND `monitoring` = ?",
            [username, monitoring_name]
        )
    }
    const insert = () => {
        sql_request(function (insert_result) {
                console.log(`Monitoring statistic add player : ${JSON.stringify(insert_result)}`)
                return insert_result
            },
            "monitoring_minecraftrating",
            "INSERT monitoring_statistic (username, monitoring, timestep, votes) VALUES (?, ?, NOW(), 1)",
            [username, monitoring_name]
        )
    }
    check_in_db(function (data) {
        if (data.length) {
            return update()
        } else {
            return insert()
        }
    })
}

module.exports = {
    monitoring_statistic
}