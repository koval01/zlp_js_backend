const {sql_request} = require("../mysql")

function getSkins(callback, usernames) {
    let check_in_db = (callback) => {
        sql_request(function (data) {
                console.log(`Get skins row : ${JSON.stringify(data)}`)
                callback(data)
            },
            "Skins",
            "SELECT Nick, Value FROM Skins WHERE Nick IN (?)",
            [JSON.stringify(usernames).slice(1, -1)]
        )
    }
    check_in_db(function (data) {
        if (data.length) {
            callback(data)
        } else {
            callback(null)
        }
    })
}

module.exports = {
    getSkins
}