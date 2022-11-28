const {sql_request} = require("../mysql")

async function getSkins (callback, usernames) {
    let check_in_db = (callback) => {
        sql_request(function (data) {
                console.log(`Get skins row : ${JSON.stringify(data)}`)
                callback(data)
            },
            "Skins",
            `SELECT Nick, Value FROM Skins WHERE Nick IN (?)`,
            [usernames]
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