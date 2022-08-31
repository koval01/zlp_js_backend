require('dotenv').config()

const request = require('request')
const compression = require('compression')
const cors = require('cors')
const html_parser = require('node-html-parser')
const express = require('express')
const mcstatus = require('minecraft-server-util')
const winston = require('winston')


const app = express()

const consoleTransport = new winston.transports.Console()
const myWinstonOptions = {
    transports: [consoleTransport]
}
const logger = new winston.createLogger(myWinstonOptions)

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
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

app.use(function (err, req, resp, next) {
    logger.error(err.stack)
    next()
    return resp.status(500).json({
        success: false,
        message: "Internal server error",
        exception: "server error"
    })
})

function main_e(resp) {
    return resp.status(503).json({
        success: false,
        message: 'Main function error', 
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

app.get('/channel', (req, resp) => {
    try {
        const choice_ = ['zalupa_history', 'zalupaonline']
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
                    body = body.toString().replace(/\\/gm, "")
                    const regex = /data-post="[A-z\d_-]*\/[\d]*"/gm
                    const matched = body.match(regex)
                    return resp.send({
                        success: true,
                        last_post: matched[matched.length - 1].match(/data-post="([A-z\d_-]*\/[\d]*)"/)[1]
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

// app.get('/channel_parse', (req, resp) => {
//     try {
//         const choice_ = ['zalupa_history', 'zalupaonline']
//         request(
//             {
//                 uri: `https://t.me/s/${choice_[req.query.choice]}?before=${req.query.before}`,
//                 method: 'POST',
//                 headers: {
//                     Origin: 'https://t.me',
//                     Referer: `https://t.me/s/${choice_[req.query.choice]}`,
//                     Host: 't.me',
//                     'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
//                     'X-Requested-With': 'XMLHttpRequest',
//                     Connection: 'keep-alive'
//                 }
//             },
//             (error, response, body) => {
//                 if (!error && response.statusCode == 200) {
//                     body = body.toString().replace(/\\/gm, "")
//                     const messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message_wrap")
//                     return resp.send({
//                         success: true,
//                         body: messages[matched.length - 1]
//                     })
//                 } else {
//                     return input_e(resp, response.statusCode, error)
//                 }
//             }
//         )
//     } catch (_) {
//         return main_e(resp)
//     }
// })

app.post('/donate/services', (req, resp) => {
    const json_body = req.body
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
    const json_body = req.body
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
    const json_body = req.body
    reccheck(function(result) {
        if (result) {
            try {
                function response_(data) {
                    if (data) {
                        data.status = (data.status === 2) ? true : false
                        return {
                            "id": data.id,
                            "customer": data.customer,
                            "email": censorEmail(data.email),
                            "enrolled": parseFloat(data.enrolled).toFixed(2),
                            "created_at": data.created_at,
                            "payment_system": data.payment_system,
                            "status": data.status,
                            "error": data.error
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
        const options = {
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

