const mysql = require('mysql')

const mysql_ = function (database_name) {
    if (typeof process.env.TEST_NODE !== 'undefined') {
        database_name = process.env.DB_DATABASE
    }
    return mysql.createConnection({
        host: process.env.DB_HOSTNAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: database_name,
        port: process.env.DB_PORT,
        ssl: false
    })
}

function sql_request(callback, database_name, query, values = []) {
    const error = (e) => console.error(`Database error: ${e}`)
    let con = mysql_(database_name)
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