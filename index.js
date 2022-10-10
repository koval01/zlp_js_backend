require('dotenv').config()

const request = require('request')
const compression = require('compression')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const html_parser = require('node-html-parser')
const express = require('express')
const mcstatus = require('minecraft-server-util')
const crypto = require('crypto')
const mysql = require('mysql')
const Redis = require("ioredis")

const { text } = require('body-parser')

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
const crypto_keys = {
    init_vector: crypto.randomBytes(16),
    security_key: crypto.randomBytes(32)
}

const app = express()
const redis = new Redis(process.env.REDIS_URL)

app.set('port', (process.env.PORT || 5000))
app.set('trust proxy', parseInt(process.env.PROXY_LAYER))
app.use(express.json())
app.use(express.urlencoded())
app.use(compression())
app.use(cors())

function logRequest(req, res, next) {
    console.log(`Request: [${req.method}] ${req.url}`)
    next()
}
app.use(logRequest)

function logError(err, req, res, next) {
    console.error(err)
    next()
}
app.use(logError)

const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 250,
	standardHeaders: true,
    message: {
        success: false,
        error: "too many requests"
    }
})
app.use(apiLimiter)

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
    let error = (e) => console.error(`Database error: ${e}`)
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
            console.log(`Monitoring statistic select : ${JSON.stringify(data)}`)
            callback(data)
        },
            "SELECT * FROM `monitoring_statistic` WHERE `username` = ? AND `monitoring` = ?", 
            [username, monitroing_name]
        )
    }
    let update = () => {
        sql_request(function(update_result) {
            console.log(`Monitoring statistic update player : ${JSON.stringify(update_result)}`)
            return update_result
        },
            "UPDATE monitoring_statistic SET `votes` = `votes` + 1, `timestep` = NOW() WHERE `username` = ? AND `monitoring` = ?", 
            [username, monitroing_name]
        )
    }
    let insert = () => {
        sql_request(function(insert_result) {
            console.log(`Monitoring statistic add player : ${JSON.stringify(insert_result)}`)
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
    console.error(err.stack)
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

function get_user_ip(req) {
    return req.headers['x-forwarded-for'].split(",\x20")[0].trim() || req.socket.remoteAddress
}

function get_current_server_time() {
    return Math.floor(new Date().getTime() / 1000)
}

function censorWord(str) {
    return str[0] + "*".repeat(3) + str.slice(-1);
}
 
function censorEmail(email){
    let arr = email.split("@");
    return censorWord(arr[0]) + "@" + arr[1];
}

function url_builder_(base_url, submit_data_) {
    let url = new URL(base_url)
    for (let i = 0; i < submit_data_.length; i++) {
        url.searchParams.set(submit_data_[i].name, submit_data_[i].value)
    }
    return url.href
}

function reccheck(req, resp, next) {
    request(
        {
            uri: "https://www.google.com/recaptcha/api/siteverify",
            method: 'POST',
            form: {
                'secret': process.env.RE_TOKEN,
                'response': req.body.token
            }
        },
        (error, response, body) => {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body)
                if (body.success) {
                    return next()
                }
            }
            return resp.status(403).json({
                success: false,
                message: 'Security error', 
                exception: 'error verify recaptcha token'
            })
        }
    )
}

function decryptor(data) {
    try {
        let decipher = crypto.createDecipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
        let decryptedData = decipher.update(data, "base64", "utf-8")

        decryptedData += decipher.final("utf8")

        if (decryptedData) {
            return decryptedData
        }
    } catch (_) {}
}

function encryptor(data) {
    let cipher = crypto.createCipheriv("aes-256-cbc", crypto_keys.security_key, crypto_keys.init_vector)
    let encryptedData = cipher.update(data, "utf-8", "base64")
    encryptedData += cipher.final("base64")
    return encryptedData
}

function crypto_check(req, resp, next) {
    decryptedData = decryptor(req.body.crypto_token)

    if (decryptedData) {
        let body = JSON.parse(decryptedData)
        if (body.ip == get_user_ip(req) && (get_current_server_time() - body.timestamp) < 900) {
            return next()
        }
    }
    return resp.status(403).json({
        success: false,
        message: 'Security error', 
        exception: 'error verify crypto token'
    })
}

app.get('/ip', (req, resp) => resp.send({success: true, ip: req.ip}))

app.post('/channel_parse', reccheck, async (req, resp) => {
    try {
        function response_call(data, cache=false) {
            return resp.send({
                cache: cache,
                success: true,
                messages: data
            })
        }
        let choice_ = ['zalupa_history', 'zalupaonline']
        if (!req.query.offset) {
            req.query.offset = 0
        }
        redis.get(choice_[req.query.choice], (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(JSON.parse(result), true)
            } else {
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
                                redis.set(choice_[req.query.choice], JSON.stringify(result), "ex", 600)
                                return response_call(result)
                            } else {
                                return input_e(resp, 503, "result array is void")
                            }
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            }
        })
    } catch (_) {
        return main_e(resp)
    }
})

app.post('/events', reccheck, async (req, resp) => {
    try {
        function response_call(data, cache=false) {
            return resp.send({
                cache: cache,
                success: true,
                events: data
            })
        }
        redis.get("game_events", (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(JSON.parse(result), true)
            } else {
                request(
                    {
                        uri: `https://t.me/s/${process.env.EVENTS_CHANNEL}`,
                        method: 'POST',
                        headers: {
                            Origin: 'https://t.me',
                            Referer: `https://t.me/s/${process.env.EVENTS_CHANNEL}`,
                            Host: 't.me',
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
                            'X-Requested-With': 'XMLHttpRequest',
                            Connection: 'keep-alive'
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            body = body.toString().replace(/\\/gm, "")
                            let time_in_moscow = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Moscow"}))
                            let message_regex = /([\s\S]+)<br>(\d\d.\d\d.\d\d-\d\d:\d\d)\/(\d\d.\d\d.\d\d-\d\d:\d\d)<br>&#33;<br>([\s\S]+)/gm
                            let time_regex = /(\d\d).(\d\d).(\d\d)-(\d\d):(\d\d)/
                            let messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message_wrap")
                            let result = []

                            let time_correction = function(date) {
                                let userTimezoneOffset = date.getTimezoneOffset() * 60000
                                return new Date(date.getTime() - userTimezoneOffset)
                            }

                            for (let i = 0; i < messages.length; i++) {
                                let container = messages[i]
                                let text_post = container.querySelector(".tgme_widget_message_text").innerHTML.toString()
                                if (text_post.length) {
                                    let parsed_match = text_post.matchAll(message_regex)
                                    for (const parsed_ of parsed_match) {
                                        if (parsed_) {
                                            let date_st = parsed_[2].match(time_regex)
                                            let date_end = parsed_[3].match(time_regex)
                                            let defined_date_st = time_correction(new Date(`20${date_st[3]}`, date_st[2] - 1, date_st[1], date_st[4], date_st[5], '00'))
                                            let defined_date_end = time_correction(new Date(`20${date_end[3]}`, date_end[2] - 1, date_end[1], date_end[4], date_end[5], '00'))
                                            let to_start = ((time_in_moscow - defined_date_st) / 1000)
                                            let to_end = ((time_in_moscow - defined_date_end) / 1000)
                                            
                                            if ((to_start > 0 || -(to_start) < 259200) && (-(to_end) > 0 || to_end < 259200)) {
                                                result.push({
                                                    title: parsed_[1],
                                                    date_start: defined_date_st.toJSON(),
                                                    date_end: defined_date_end.toJSON(),
                                                    text: parsed_[4]
                                                })
                                            }
                                        }
                                    }
                                }
                            }
                            if (result.length) {
                                redis.set("game_events", JSON.stringify(result), "ex", 600)
                                return response_call(result)
                            } else {
                                return input_e(resp, 503, "result array is void")
                            }
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            }
        })
    } catch (_) {
        return main_e(resp)
    }
})

app.get('/monitoringminecraft.ru', async (req, resp) => {
    // temporary function
    resp.set("Content-Type", "text/html")
    resp.send("7adb86d84714ddd37f4961795e233de2")
})

app.get('/tmonitoring_promotion', async (req, resp) => {
    let body = req.query
    let api_host = "https://tmonitoring.com/api/check/"
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

    let stat = () => {
        monitoring_statistic(get_mon_()["name"], body.username)
    }

    let api_resp = get_data()
    if (api_resp) {
        if (api_resp.hash != 32 || body.hash != 32 || api_resp.hash != body.hash) {
            resp.send("Invalid hash")
        }
        body.username = api_resp.username
        // give award
        return resp.send("ok")
    }
    return resp.send("Error")
    
})

app.post('/promotion', async (req, resp) => {
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

    let permission_ident = get_mon_()["permission"]
    if (!permission_ident) {
        return resp.send("Неверно указан мониторинг")
    }

    if (!body.username || !body.ip || !body.timestamp || !body.signature) {
        return resp.send("Присланы не все данные, вероятно запрос подделан")
    }

    let shasum = crypto.createHash('sha1')
    shasum.update(body.username + body.timestamp + secrets[get_mon_()["name"]])
    let signature = shasum.digest('hex')

    if (body.signature != signature) {
        return resp.send("Неверная подпись / секретный ключ")
    }

    let stat = () => {
        monitoring_statistic(get_mon_()["name"], body.username)
    }

    sql_request(function(result) {
        let error = () => resp.send("Ошибка базы данных")
        let no_player = () => resp.send("Игрок не найден")
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
                sql_request(function(update_result) {
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
            sql_request(function(permission) {
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
})

app.post('/donate/services', reccheck, async (req, resp) => {
    try {
        function response_call(data, cache=false) {
            return resp.send({
                cache: cache,
                success: true,
                services: data
            })
        }
        function response_(data) {
            let result = []
            for (let i = 0; i < data.length; i++) {
                if (!data[i].is_hidden) {
                    result.push({
                        id: data[i].id,
                        name: data[i].name,
                        description: data[i].description,
                        image: data[i].image,
                        price: data[i].price,
                        old_price: data[i].old_price,
                        type: data[i].type,
                        number: data[i].number,
                        server_id: encryptor((data[i].servers[0].id).toString())
                    })
                }
            }
            return result
        }
        redis.get("donate_services", (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(JSON.parse(result), true)
            } else {
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
                                let response_data = response_(body.response)
                                redis.set("donate_services", JSON.stringify(response_data), "ex", 600)
                                return response_call(response_data)
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
            }
        })
    } catch (_) {
        return main_e(resp)
    }
})

app.post('/donate/coupon', reccheck, async (req, resp) => {
    let json_body = req.body
    try {
        function response_(data) {
            if (data) {
                let products = data.products
                let products_list = []
                for (let i = 0; i < products.length; i++) {
                    products_list.push({
                        id: products[i].id,
                        name: products[i].name
                    })
                }
                return {
                    code: data.code,
                    discount: data.sale,
                    products: products_list

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
})

app.post('/donate/payment_get', reccheck, async (req, resp) => {
    let json_body = req.body
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
                    id: data.id,
                    customer: data.customer,
                    email: censorEmail(data.email),
                    created_at: data.created_at,
                    payment_system: data.payment_system,
                    status: data.status,
                    enrolled: data.enrolled
                }
            } else {
                return null
            }
        }
        function response_call(result, cache=false) {
            return resp.send({
                success: true,
                cache: cache,
                payment: result
            })
        }
        redis.get(json_body.payment_id, (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(JSON.parse(result), true)
            } else {
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
                                let payment = response_(body.response)
                                redis.set(json_body.payment_id, JSON.stringify(payment), "ex", 1000)
                                return resp.send(response_call(payment))
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
            }
        })
    } catch (_) {
        return main_e(resp)
    }
})

app.post('/donate/payment/create', reccheck, async (req, resp) => {
    let json_body = req.body
    let server_id = decryptor(json_body.server_id)
    if (server_id) {
        server_id = parseInt(server_id)
        if (!(Number.isInteger(server_id) && 999999 > server_id > 1000)) {
            return input_e(resp, 400, "server_id error")
        }
    }
    try {
        let url = url_builder_(
            'https://easydonate.ru/api/v3/shop/payment/create',
            [
                { name: "customer", value: json_body.customer },
                { name: "server_id", value: server_id },
                { name: "products", value: JSON.stringify(json_body.products) },
                { name: "email", value: json_body.email },
                { name: "coupon", value: json_body.coupon },
                { name: "success_url", value: json_body.success_url },
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
                                url: body.response.url,
                                bill_id: body.response.payment.id
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
})

app.post('/crypto', reccheck, async (req, resp) => {
    return resp.send({
        success: true, token: encryptor(JSON.stringify({
            ip: get_user_ip(req),
            timestamp: get_current_server_time()
        }))
    })
})

app.post('/server', crypto_check, async (req, resp) => {
    try {
        let options = {
            timeout: 1000 * 2
        }
        function result_(data) {
            return {
                online: data.players.online
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

app.get('*', async (req, resp) => {
    return resp.status(404).json({
        success: false,
        message: "This route cannot be found",
        exception: "error route"
    })
})

app.listen(app.get('port'), () => {
    console.log(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    console.error(`Uncaught exception: ${exception}`)
})