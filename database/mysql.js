const mysql = require('mysql')

const mysql_ = function() {
    return cursor = mysql.createConnection({
        host: process.env.DB_HOSTNAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        ssl: false
    })
}

function sql_request(callback, query, values = []) {
    const error = (e) => console.error(`Database error: ${e}`)
    let con = mysql_()
    con.query(query, values, 
        function (err, result, _) {
            if (err) error(err)
            callback(result)
            con.end()
    })
}

module.exports = {
    mysql_,
    sql_request
}