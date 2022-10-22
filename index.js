require('dotenv').config()

const request = require('request')
const qs = require('querystring')
const compression = require('compression')
const cors = require('cors')
const html_parser = require('node-html-parser')
const express = require('express')
const Redis = require("ioredis")

const log = require("./helpers/log")
const {censorEmail, url_builder_, ip_get_view} = require("./helpers/methods")

const catchAsync = require("./skin_renderer/helpers/catchAsync")
const {getHead} = require("./skin_renderer/controller/head")
const {get3dBody, get3dHead} = require("./skin_renderer/controller/render")

const {getVerifiedTelegramData} = require("./helpers/telegram")
const {apiLimiter, methodLimiter} = require("./helpers/limiters")
const {global_error} = require("./middleware/other_middle")
const {re_check, tg_check} = require("./middleware/security_middle")
const {input_e, main_e} = require("./helpers/errors")

const static_view = require("./static")
const {crypto_view_, crypto_check_get} = require("./helpers/crypto")
const {mc_status_view} = require("./helpers/server_status")
const {promotion_view, t_monitoring_promotion} = require("./helpers/promotion");

const app = express()
const redis = new Redis(process.env.REDIS_URL)

app.set('port', (process.env.PORT || 5000))
app.set('trust proxy', parseInt(process.env.PROXY_LAYER))

app.use(express.json())
app.use(express.urlencoded())
app.use(compression())
app.use(cors())

app.use(log.logRequest)
app.use(log.logError)

app.use(apiLimiter)
app.use(global_error)

app.post('/channel_get', methodLimiter, re_check, async (req, resp) => {
    try {
        function response_call(data, cache = false) {
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
        redis.get(`channel_get_${choice_[req.query.choice]}`, (error, result) => {
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
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
                            'X-Requested-With': 'XMLHttpRequest',
                            Connection: 'keep-alive'
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = body.toString().replace(/(\\n)/gm, "").replace(/\\/gm, "")
                            let messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message")
                            if (!req.query.offset) {
                                req.query.offset = 5
                            }
                            messages = messages.slice(parseInt(req.query.limit))
                            let result = []
                            for (let i = 0; i < messages.length; i++) {
                                let text_format = messages[i].toString()
                                if (text_format.length) {
                                    result.push(text_format)
                                }
                            }
                            if (result.length) {
                                redis.set(`channel_get_${choice_[req.query.choice]}`, JSON.stringify(result), "ex", 5)
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

app.post('/channel_parse', methodLimiter, re_check, async (req, resp) => {
    try {
        function response_call(data, cache = false) {
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
        redis.get(`channel_parse_${choice_[req.query.choice]}`, (error, result) => {
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
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
                            'X-Requested-With': 'XMLHttpRequest',
                            Connection: 'keep-alive'
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
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
                                try {
                                    text = container.querySelector(".tgme_widget_message_text").innerHTML
                                } catch (_) {
                                }
                                try {
                                    author = container.querySelector(".tgme_widget_message_from_author").text
                                } catch (_) {
                                }
                                try {
                                    cover = container.querySelector(".tgme_widget_message_photo_wrap").getAttribute("style")
                                } catch (_) {
                                    try {
                                        cover = container.querySelector(".tgme_widget_message_video_thumb").getAttribute("style")
                                    } catch (_) {
                                    }
                                }
                                if (cover) {
                                    try {
                                        cover = cover.match(cover_regex)[1]
                                    } catch (_) {
                                    }
                                }
                                let regex_link = /(https:\/\/t.me\/)([A-z\d_\-]*?\/[\d]*$)/
                                let org_link = container.querySelector(".tgme_widget_message_date").getAttribute("href")
                                let link = `https://t.me/s/${org_link.match(regex_link)[2]}`
                                if (text.length > 3 && text.toLowerCase() !== "live stream started" && !text.toLowerCase().includes("pinned a file")) {
                                    text = text.replaceAll(/>(https:|http:)(\/\/www.)/gm, ">")
                                    text = text.replaceAll(/(<a .*?">)(.*?)(\/.*?)(<\/a>)/gm, '$1$2$4')
                                    result.push({
                                        text: text.trim(),
                                        name: container.querySelector(".tgme_widget_message_owner_name > span").text,
                                        author: author,
                                        cover: cover,
                                        datetime_utc: container.querySelector(".tgme_widget_message_date > time").getAttribute("datetime"),
                                        link: link
                                    })
                                }
                            }
                            if (result.length) {
                                redis.set(`channel_parse_${choice_[req.query.choice]}`, JSON.stringify(result), "ex", 120)
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

app.post('/events', methodLimiter, re_check, async (req, resp) => {
    try {
        function response_call(data, cache = false) {
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
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
                            'X-Requested-With': 'XMLHttpRequest',
                            Connection: 'keep-alive'
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = body.toString().replace(/\\/gm, "")
                            let time_in_moscow = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Moscow"}))
                            let message_regex = /([\s\S]+)<br>(\d\d.\d\d.\d\d-\d\d:\d\d)\/(\d\d.\d\d.\d\d-\d\d:\d\d)<br>&#33;<br>([\s\S]+)/gm
                            let time_regex = /(\d\d).(\d\d).(\d\d)-(\d\d):(\d\d)/
                            let messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message_wrap")
                            let result = []

                            let time_correction = function (date) {
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
                                redis.set("game_events", JSON.stringify(result), "ex", 120)
                                return response_call(result)
                            } else {
                                return input_e(resp, 200, "result array is void")
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

app.post('/promotion', catchAsync(promotion_view))

app.post('/donate/services', methodLimiter, re_check, async (req, resp) => {
    try {
        function response_call(data, cache = false) {
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
                    let f = data[i]
                    result.push({
                        id: f.id,
                        name: f.name,
                        description: f.description,
                        image: f.image,
                        price: f.price,
                        old_price: f.old_price,
                        type: f.type,
                        number: f.number,
                        server_id: encryptor((f.servers[0].id).toString())
                    })
                }
            }
            return result
        }

        redis.get("donate_services", (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(response_(JSON.parse(result)), true)
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
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                let response_data = body.response
                                redis.set("donate_services", JSON.stringify(response_data), "ex", 600)
                                return response_call(response_(response_data))
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

app.post('/donate/coupon', methodLimiter, re_check, async (req, resp) => {
    let json_body = req.body
    if (json_body.code.length > 35) {
        return input_e(resp, 400, "coupon is long")
    }
    try {
        function response_call(data, cache = false) {
            return resp.send({
                cache: cache,
                success: !!data,
                coupon: data
            })
        }

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
                    if (data[i].code.toLowerCase() === name.toLowerCase()) {
                        return data[i]
                    }
                }
            }
            return null
        }

        redis.get(`coupon_${json_body.code}`, (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(JSON.parse(result), true)
            } else {
                request(
                    {
                        uri: `https://easydonate.ru/api/v3/shop/coupons?where_active=true`,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                let coupon_str = response_(select_coupon(body.response, json_body.code))
                                redis.set(`coupon_${json_body.code}`, JSON.stringify(coupon_str), "ex", 600)
                                return response_call(coupon_str)
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

app.post('/donate/payment_get', methodLimiter, re_check, async (req, resp) => {
    let json_body = req.body
    try {
        function response_(data) {
            if (data) {
                if (json_body.tokens_send) {
                    let pattern = data.products[0].commands[0]
                    let exc_com = data.sent_commands[0].command

                    let split_pattern = pattern.split("\x20")
                    let split_exc_com = exc_com.split("\x20")

                    for (let i = 0; i < split_pattern.length; i++) {
                        if (split_pattern[i] === "{amount}") {
                            data.enrolled = parseInt(split_exc_com[i])
                        }
                    }
                } else {
                    data.enrolled = 0
                }
                data.status = (data.status === 2)
                let p = data.products[0]
                return {
                    id: data.id,
                    customer: data.customer,
                    email: censorEmail(data.email),
                    created_at: data.created_at,
                    payment_system: data.payment_system,
                    status: data.status,
                    enrolled: data.enrolled,
                    product: {
                        name: p.name,
                        price: p.price,
                        type: p.type,
                        number: p.number,
                        description: p.description,
                        image: p.image
                    }
                }
            } else {
                return null
            }
        }

        function response_call(result, cache = false) {
            return resp.send({
                success: true,
                cache: cache,
                payment: result
            })
        }

        redis.get(`payment_${json_body.payment_id}`, (error, result) => {
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
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                let payment = response_(body.response)
                                redis.set(`payment_${json_body.payment_id}`, JSON.stringify(payment), "ex", 1000)
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

app.post('/donate/payment/create', methodLimiter, re_check, async (req, resp) => {
    let json_body = req.body
    let server_id = decryptor(json_body.server_id)

    if (server_id) {
        server_id = parseInt(server_id)
        if (!Number.isInteger(server_id)) {
            return input_e(resp, 400, "server_id error")
        }
    } else {
        return input_e(resp, 400, "server_id error")
    }

    console.log(`paymentCreate: server_id=${server_id}`)
    try {
        let products_stringified = JSON.stringify(json_body.products)
        // if (Object.keys(products_stringified).length !== 1) {
        //     return input_e(resp, 400, "products error")
        // }
        let url = url_builder_(
            'https://easydonate.ru/api/v3/shop/payment/create',
            [
                {name: "customer", value: json_body.customer},
                {name: "server_id", value: server_id},
                {name: "products", value: products_stringified},
                {name: "email", value: json_body.email},
                {name: "coupon", value: json_body.coupon},
                {name: "success_url", value: json_body.success_url},
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
                if (!error && response.statusCode === 200) {
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

app.post('/feedback/send', methodLimiter, re_check, tg_check, async (req, resp) => {
    let json_body = req.body
    let tg_user = getVerifiedTelegramData(json_body)
    const remove_repeats = (text) => {
        let arr = text.split("\x20")
        let newArr = []
        let last = null
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== last) {
                newArr.push(arr[i])
            }
            last = arr[i]
        }
        return newArr.join("\x20")
    }
    redis.get(`feedback_${req.ip}_tg${tg_user.id}`, (error, result) => {
        if (error) throw error
        if (result !== null) {
            return input_e(resp, resp.statusCode, "need wait")
        } else {
            let text = json_body.text
            const text_c = text
            if (text && text.length > 10 && text.length <= 3001) {
                text = text.replaceAll(/<.*?>/gm, "").trim().match(/['!"#$%&()*+,\-.\/:;<=>?@\[\]^_{|}~\w\u0430-\u044f]+/ig).join("\x20").trim()
                text = remove_repeats(text)
                if (text.length !== text_c.length) {
                    return input_e(resp, 403, "text field check error")
                }
                let username = (tg_user.username && tg_user.username.length) ? `(@${tg_user.username})` : ""
                tg_user.last_name ? tg_user.last_name : ""
                let user_name_builded = `<a href="tg://user?id=${tg_user.id}">${tg_user.first_name} ${tg_user.last_name}</a> ${username}`
                request(
                    {
                        uri: `https://api.telegram.org/bot${process.env.FEEDBACK_BOT_TOKEN}/sendMessage?chat_id=${process.env.FEEDBACK_BOT_CHAT_ID}&${qs.stringify({
                            text: `${text}\n\n${"_".repeat(10)}\n${user_name_builded}\n\nTG_ID:\x20${tg_user.id}\nIP:\x20<tg-spoiler>${req.ip}</tg-spoiler>`
                        })}&parse_mode=HTML`,
                        method: 'GET'
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.ok) {
                                redis.set(`feedback_${req.ip}_tg${tg_user.id}`, "ok", "ex", 60)
                                return resp.json({
                                    success: true
                                })
                            }
                            return input_e(resp, response.statusCode, "telegram api error")
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            } else {
                return input_e(resp, 400, "text not valid")
            }
        }
    })
})

app.post('/feedback/check', methodLimiter, re_check, tg_check, async (req, resp) => {
    let tg_user = getVerifiedTelegramData(req.body)
    redis.get(`feedback_${req.ip}_tg${tg_user.id}`, (error, result) => {
        if (error) throw error
        if (result !== null) {
            return input_e(resp, resp.statusCode, "need wait")
        } else {
            return resp.json({
                success: true
            })
        }
    })
})

app.post('/crypto', methodLimiter, re_check, catchAsync(crypto_view_))

app.post('/telegram/auth/check', methodLimiter, tg_check, async (_, resp) => {
    return resp.send({success: true})
})

app.get('/ip', catchAsync(ip_get_view))

app.get('/monitoringminecraft.ru', static_view.monitoring_minecraft_ru)

app.get('/tmonitoring_promotion', catchAsync(t_monitoring_promotion))

app.get('/profile/avatar', methodLimiter, catchAsync(getHead))

app.get('/profile/head', methodLimiter, catchAsync(get3dHead))

app.get('/profile/body', methodLimiter, catchAsync(get3dBody))

app.get('/server', methodLimiter, crypto_check_get, catchAsync(mc_status_view))

app.get('*', async (_, resp) => {
    return main_e(resp, "error route", "This route cannot be found")
})

app.listen(app.get('port'), () => {
    console.log(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    console.error(`Uncaught exception: ${exception}`)
})