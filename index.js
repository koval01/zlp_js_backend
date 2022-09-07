require('dotenv').config()

const request = require('request')
const compression = require('compression')
const cors = require('cors')
const html_parser = require('node-html-parser')
const express = require('express')
const mcstatus = require('minecraft-server-util')
const winston = require('winston')
const crypto = require('crypto')
const mysql = require('mysql')

const monitorings = [
    {
        name: "minecraftrating.ru",
        permission: "monitoring_1",
    },
    {
        name: "monitoringminecraft.ru",
        permission: "monitoring_2",
    }
]
const secrets = JSON.parse(process.env.MONITORING_SECRETS)


const app = express()

const consoleTransport = new winston.transports.Console()
const myWinstonOptions = {
    transports: [consoleTransport]
}
const logger = new winston.createLogger(myWinstonOptions)

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
app.use(express.urlencoded())
app.use(compression())
app.use(cors())

function logRequest(req, res, next) {
    logger.info(req.url)
    next()
}
app.use(logRequest)

function logError(err, req, res, next) {
    logger.error(err)
    next()
}
app.use(logError)

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
    let error = (e) => logger.error(`Database error: ${e}`)
    let con = mysql_()
    con.query(query, values, 
        function (err, result, _) {
            if (err) error(err)
            callback(result)
            con.end()
    })
}

function monitoring_statistic(monitroing_name, username) {
    let check_in_db = (callback) => {
        sql_request(function(data) {
            logger.info(`Monitoring statistic select : ${JSON.stringify(data)}`)
            callback(data)
        },
            "SELECT * FROM `monitoring_statistic` WHERE `username` = ? AND `monitoring` = ?", 
            [username, monitroing_name]
        )
    }
    let update = () => {
        sql_request(function(update_result) {
            logger.info(`Monitoring statistic update player : ${JSON.stringify(update_result)}`)
            return update_result
        },
            "UPDATE monitoring_statistic SET `votes` = `votes` + 1, `timestep` = NOW() WHERE `username` = ? AND `monitoring` = ?", 
            [username, monitroing_name]
        )
    }
    let insert = () => {
        sql_request(function(insert_result) {
            logger.info(`Monitoring statistic add player : ${JSON.stringify(insert_result)}`)
            return insert_result
        },
            "INSERT monitoring_statistic (username, monitoring, timestep, votes) VALUES (?, ?, NOW(), 1)", 
            [username, monitroing_name]
        )
    }
    check_in_db(function(data) {
        if (data.length) {
            return update()
        } else { return insert() }
    })
}

app.use(function (err, req, resp, next) {
    logger.error(err.stack)
    next()
    return resp.status(500).json({
        success: false,
        message: "Internal server error",
        exception: "server error"
    })
})

function main_e(resp, error = "", message = "Main function error") {
    return resp.status(503).json({
        success: false,
        message: message, 
        exception: error
    })
}

function input_e(resp, code, error) {
    return resp.status(code).json({ 
        success: false, message: "Input function error", exception: error 
    })
}

function re_error(resp) {
    return resp.status(403).json({
        success: false,
        message: 'Security error', 
        exception: 'error verify recaptcha token'
    })
}

function censorWord(str) {
    return str[0] + "*".repeat(3) + str.slice(-1);
}
 
function censorEmail(email){
    var arr = email.split("@");
    return censorWord(arr[0]) + "@" + arr[1];
}

function url_builder_(base_url, submit_data_) {
    let url = new URL(base_url)
    for (let i = 0; i < submit_data_.length; i++) {
        url.searchParams.set(submit_data_[i].name, submit_data_[i].value)
    }
    return url.href
}

function reccheck(callback, token) {
    request(
        {
            uri: "https://www.google.com/recaptcha/api/siteverify",
            method: 'POST',
            form: {
                'secret': process.env.RE_TOKEN,
                'response': token
            }
        },
        (error, response, body) => {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body)
                callback(body.success)
            } else {
                callback(false)
            }
        }
    )
}

app.get('/channel_parse', (req, resp) => {
    try {
        let choice_ = ['zalupa_history', 'zalupaonline']
        if (!req.query.offset) {
            req.query.offset = 0
        }
        request(
            {
                uri: `https://t.me/s/${choice_[req.query.choice]}?before=${req.query.before}`,
                method: 'POST',
                headers: {
                    Origin: 'https://t.me',
                    Referer: `https://t.me/s/${choice_[req.query.choice]}`,
                    Host: 't.me',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
                    'X-Requested-With': 'XMLHttpRequest',
                    Connection: 'keep-alive'
                }
            },
            (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let cover_regex = /background-image:url\('(.*?)'\)/
                    body = body.toString().replace(/\\/gm, "")
                    let messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message")
                    if (!req.query.offset) {
                        req.query.offset = 5
                    }
                    messages = messages.slice(parseInt(req.query.limit))
                    let result = []
                    for (let i = 0; i < messages.length; i++) {
                        let container = messages[i]
                        let text = ""
                        let author = ""
                        let cover = ""
                        try { text = container.querySelector(".tgme_widget_message_text").innerHTML } catch (_) {}
                        try { author = container.querySelector(".tgme_widget_message_from_author").text } catch (_) {}
                        try { cover = container.querySelector(".tgme_widget_message_photo_wrap").getAttribute("style") } catch (_) {
                            try { cover = container.querySelector(".tgme_widget_message_video_thumb").getAttribute("style") } catch (_) {}
                        }
                        if (cover) {
                            try { cover = cover.match(cover_regex)[1] } catch (_) { }
                        }
                        let regex_link = /(https:\/\/t.me\/)([A-z\d_\-]*?\/[\d]*$)/
                        let org_link = container.querySelector(".tgme_widget_message_date").getAttribute("href")
                        let link = `https://t.me/s/${org_link.match(regex_link)[2]}`
                        if (text.length) {
                            result.push({
                                text: text,
                                name: container.querySelector(".tgme_widget_message_owner_name > span").text,
                                author: author,
                                cover: cover,
                                datetime_utc: container.querySelector(".tgme_widget_message_date > time").getAttribute("datetime"),
                                link: link
                            })
                        }
                    }
                    if (result.length) {
                        return resp.send({
                            success: true,
                            messages: result
                        })
                    } else {
                        return input_e(resp, 503, "result array is void")
                    }
                } else {
                    return input_e(resp, response.statusCode, error)
                }
            }
        )
    } catch (_) {
        return main_e(resp)
    }
})

app.get('/monitoringminecraft.ru', (req, resp) => {
    // temporary function
    resp.set("Content-Type", "text/html")
    resp.send("7adb86d84714ddd37f4961795e233de2")
})

let give_award = (body, monitoring) => {
    let permission_ident = monitoring["permission"]
    let stat = () => {
        monitoring_statistic(monitoring["name"], body.username)
    }

    sql_request(function(result) {
        let e = (t) => {
            let r = {error: `${t} : ${result}`}
            logger.error(r.error)
            return r
        }
        let error = () => { 
            return e("Error give award, database result")
        }
        let no_player = () => { 
            return e("Error give award, player not found. Database result")
        }
        let permission_already_given = () => { 
            return e("Error give award, already given. Database result")
        }
        console.log(result)
        if (!result) {
            return error()
        }
        else if (!result.length) {
            return no_player()
        }
        else if (!result[0].uuid) {
            return no_player()
        }
        else {
            let add_permission = () => {
                sql_request(function(insert_result) {
                    if (insert_result) {
                        stat()
                        logger.info(`Result insert to luckperms : ${JSON.stringify(insert_result)}`)
                        return "ok"
                    }
                    return error()
                },
                    "INSERT luckperms_user_permissions (uuid, permission, value, server, world, expiry, contexts) VALUES (?, ?, 1, 'global', 'global', '0', '{}')", 
                    [result[0].uuid, permission_ident]
                )
            }
            let update_permission = () => {
                sql_request(function(update_result) {
                    if (update_result) {
                        stat()
                        logger.info(`Result update row in luckperms : ${JSON.stringify(update_result)}`)
                        return {ok: true}
                    }
                    return error()
                },
                    "UPDATE luckperms_user_permissions SET `value` = 1 WHERE `uuid` = ? AND `permission` = ? ORDER BY id DESC LIMIT 1", 
                    [result[0].uuid, permission_ident]
                )
            }
            sql_request(function(permission) {
                if (!permission.length) {
                    return add_permission()
                } else if (parseInt(permission[0].value) !== 1) {
                    return update_permission()
                } else if (parseInt(permission[0].value) === 1) {
                    return permission_already_given()
                }
                return error()
            }, 
                "SELECT `uuid`, `permission`, `value` FROM luckperms_user_permissions WHERE `uuid` = ? AND `permission` = ? ORDER BY id DESC LIMIT 1", 
                [result[0].uuid, permission_ident]
            )
        }
        return error()
    }, 
        "SELECT `uuid` FROM `luckperms_players` WHERE `username` = ?", 
        [body.username]
    )
}

app.get('/tmonitoring_promotion', (req, resp) => {
    let body = req.query
    let api_host = "https://tmonitoring.com/api/check"
    resp.set("Content-Type", "text/html")

    let get_data = (callback) => {
        request(
            {
                uri: `${api_host}/${body.hash}?id=${body.id}`,
                method: "GET",
            },
            (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body)
                    callback(body)
                } else {
                    callback({})
                }
            }
        )
    }

    let api_resp = get_data()
    if (api_resp) {
        if (api_resp.hash != 32 || body.hash != 32 || api_resp.hash != body.hash) {
            resp.send("Invalid hash")
        }
        body.username = api_resp.username
        let award_ = give_award(body, {
            name: "tmonitoring.com",
            permission: "monitoring_3",
        })
        if (award_) {
            if (award_.ok) {
                return resp.send("ok")
            } else if (award_.error) {
                return resp.send(award_.error)
            }
        }
    }
    resp.send("Error")
})

app.post('/promotion', (req, resp) => {
    let body = req.body
    resp.set("Content-Type", "text/html")

    if (!req.query.monitoring) {
        return resp.send("Не указан мониторинг")
    }

    let get_mon_ = () => {
        for (i=0; i < monitorings.length; i++) {
            if (req.query.monitoring === monitorings[i].name) {
                return monitorings[i]
            }
        }
    }
    let mon = get_mon_()

    if (!mon["name"]) {
        return resp.send("Неверно указан мониторинг")
    }

    if (!body.username || !body.ip || !body.timestamp || !body.signature) {
        return resp.send("Присланы не все данные, вероятно запрос подделан")
    }

    let shasum = crypto.createHash('sha1')
    shasum.update(body.username + body.timestamp + secrets[mon["name"]])
    let signature = shasum.digest('hex')

    if (body.signature != signature) {
        return resp.send("Неверная подпись / секретный ключ")
    }

    let award_ = give_award(body, mon)
    console.log(award_)
    if (award_) {
        if (award_.ok) {
            return resp.send("ok")
        } else if (award_.error) {
            return resp.send(award_.error)
        }
    }

    return resp.send("Error")
})

app.post('/donate/services', (req, resp) => {
    let json_body = req.body
    reccheck(function(result) {
        if (result) {
            try {
                function response_(data) {
                    let result = []
                    for (let i = 0; i < data.length; i++) {
                        if (!data[i].is_hidden) {
                            result.push({
                                "id": data[i].id,
                                "name": data[i].name,
                                "description": data[i].description,
                                "image": data[i].image,
                                "price": data[i].price,
                                "old_price": data[i].old_price,
                                "type": data[i].type,
                                "number": data[i].number
                            })
                        }
                    }
                    return result
                }
                request(
                    {
                        uri: `https://easydonate.ru/api/v3/shop/products`,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                return resp.send({
                                    success: true,
                                    services: response_(body.response)
                                })
                            }
                            return resp.status(503).json({
                                success: false,
                                message: "Error check response EasyDonate API",
                                exception: "var success is not true"
                            })
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            } catch (_) {
                return main_e(resp)
            }
        } else {
            return re_error(resp)
        }
    }, json_body.token)
})

app.post('/donate/coupon', (req, resp) => {
    let json_body = req.body
    reccheck(function(result) {
        if (result) {
            try {
                function response_(data) {
                    if (data) {
                        let products = data.products
                        let products_list = []
                        for (let i = 0; i < products.length; i++) {
                            products_list.push({
                                "id": products[i].id,
                                "name": products[i].name
                            })
                        }
                        return {
                            "code": data.code,
                            "discount": data.sale,
                            "products": products_list

                        }
                    } else {
                        return null
                    }
                }
                function select_coupon(data, name) {
                    if (data) {
                        for (let i = 0; i < data.length; i++) {
                            if (data[i].code === name) {
                                return data[i]
                            }
                        }
                    }
                    return null
                }
                request(
                    {
                        uri: `https://easydonate.ru/api/v3/shop/coupons?where_active=true`,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                return resp.send({
                                    success: true,
                                    coupon: response_(select_coupon(body.response, json_body.code))
                                })
                            }
                            return resp.status(503).json({
                                success: false,
                                message: "Error check response EasyDonate API",
                                exception: "var success is not true"
                            })
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            } catch (_) {
                return main_e(resp)
            }
        } else {
            return re_error(resp)
        }
    }, json_body.token)
})

app.post('/donate/payment_get', (req, resp) => {
    let json_body = req.body
    reccheck(function(result) {
        if (result) {
            try {
                function response_(data) {
                    if (data) {
                        if (json_body.tokens_send) {
                            let pattern = data.products[0].commands[0]
                            let exc_com = data.sent_commands[0].command
    
                            let splitted_pattern = pattern.split("\x20")
                            let splitted_exc_com = exc_com.split("\x20")
    
                            for (let i = 0; i < splitted_pattern.length; i++) {
                                if (splitted_pattern[i] === "{amount}") {
                                    data.enrolled = parseInt(splitted_exc_com[i])
                                }
                            }
                        } else { data.enrolled = 0 }
                        data.status = (data.status === 2) ? true : false
                        return {
                            "id": data.id,
                            "customer": data.customer,
                            "email": censorEmail(data.email),
                            "created_at": data.created_at,
                            "payment_system": data.payment_system,
                            "status": data.status,
                            "enrolled": data.enrolled
                        }
                    } else {
                        return null
                    }
                }
                request(
                    {
                        uri: `https://easydonate.ru/api/v3/shop/payment/${json_body.payment_id}`,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                return resp.send({
                                    success: true,
                                    payment: response_(body.response)
                                })
                            }
                            return resp.status(503).json({
                                success: false,
                                message: "Error check response EasyDonate API",
                                exception: "var success is not true"
                            })
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            } catch (_) {
                return main_e(resp)
            }
        } else {
            return re_error(resp)
        }
    }, json_body.token)
})

app.post('/donate/payment/create', (req, resp) => {
    let json_body = req.body
    reccheck(function(result) {
        if (result) {
            try {
                let url = url_builder_(
                    'https://easydonate.ru/api/v3/shop/payment/create',
                    [
                        { "name": "customer", "value": json_body.customer },
                        { "name": "server_id", "value": process.env.SERVER_ID },
                        { "name": "products", "value": JSON.stringify(json_body.products) },
                        { "name": "email", "value": json_body.email },
                        { "name": "coupon", "value": json_body.coupon },
                        { "name": "success_url", "value": json_body.success_url },
                    ]
                )
                request(
                    {
                        uri: url,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                return resp.send({
                                    success: true,
                                    payment: {
                                        "url": body.response.url,
                                        "bill_id": body.response.payment.id
                                    } 
                                })
                            }
                            return resp.status(503).json({
                                success: false,
                                message: "Error check response EasyDonate API",
                                exception: "var success is not true"
                            })
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            } catch (_) {
                return main_e(resp)
            }
        } else {
            return re_error(resp)
        }
    }, json_body.token)
})

app.get('/server', (req, resp) => {
    try {
        let options = {
            timeout: 1000 * 3
        }
        function result_(data) {
            return {
                "online": data.players.online
            }
        }
        mcstatus.status('zalupa.online', 25565, options)
            .then((result) => resp.send({
                success: true, body: result_(result)
            }))
            .catch((error) => resp.status(503).json({
                success: false,
                message: 'Server data get error', 
                exception: error
            }))
    } catch (_) {
        return main_e(resp)
    }
})

app.get('*', function(req, resp){
    return resp.status(404).json({
        success: false,
        message: "This route cannot be found",
        exception: "error route"
    })
})

app.listen(app.get('port'), () => {
    logger.info(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    logger.error(`Uncaught exception: ${exception}`)
})

