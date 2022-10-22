const {sql_request} = require("../mysql")

function monitoring_statistic(monitroing_name, username) {
    let check_in_db = (callback) => {
        sql_request(function (data) {
                console.log(`Monitoring statistic select : ${JSON.stringify(data)}`)
                callback(data)
            },
            "SELECT * FROM `monitoring_statistic` WHERE `username` = ? AND `monitoring` = ?",
            [username, monitroing_name]
        )
    }
    const update = () => {
        sql_request(function (update_result) {
                console.log(`Monitoring statistic update player : ${JSON.stringify(update_result)}`)
                return update_result
            },
            "UPDATE monitoring_statistic SET `votes` = `votes` + 1, `timestep` = NOW() WHERE `username` = ? AND `monitoring` = ?",
            [username, monitroing_name]
        )
    }
    const insert = () => {
        sql_request(function (insert_result) {
                console.log(`Monitoring statistic add player : ${JSON.stringify(insert_result)}`)
                return insert_result
            },
            "INSERT monitoring_statistic (username, monitoring, timestep, votes) VALUES (?, ?, NOW(), 1)",
            [username, monitroing_name]
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