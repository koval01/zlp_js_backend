const request = require('request')
const compression = require('compression')
const cors = require('cors')
const html_parser = require('node-html-parser')
const express = require('express')
const mcstatus = require('minecraft-server-util')

const app = express()

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
app.use(compression())
app.use(cors())

function url_builder_(base_url, submit_data_) {
    let url = new URL(base_url)
    for (let i = 0; i < submit_data_.length; i++) {
        url.searchParams.set(submit_data_[i].name, submit_data_[i].value)
    }
    return url.href
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
                    resp.send({
                        success: true,
                        last_post: matched[matched.length - 1].match(/data-post="([A-z\d_-]*\/[\d]*)"/)[1]
                    })
                } else {
                    resp.send({ success: false, message: 'Input function error', exception: error })
                }
            }
        )
    } catch (error) {
        resp.send({
            success: false,
            error_body: {
                message: 'Global function error', exception: error
            }
        })
    }
})

app.get('/channel_parse', (req, resp) => {
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
                    const messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message_wrap")
                    resp.send({
                        success: true,
                        body: messages[matched.length - 1]
                    })
                } else {
                    resp.send({ success: false, message: 'Input function error', exception: error })
                }
            }
        )
    } catch (error) {
        resp.send({
            success: false,
            error_body: {
                message: 'Global function error', exception: error
            }
        })
    }
})

app.get('/donate/services', (req, resp) => {
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
                        resp.send({
                            success: true,
                            services: response_(body.response)
                        })
                    }
                    resp.send({
                        success: false,
                        message: "Error check response EasyDonate API",
                        exception: "var success is not true"
                    })
                } else {
                    resp.send({ success: false, message: 'Input function error', exception: error })
                }
            }
        )
    } catch (error) {
        resp.send({
            success: false,
            error_body: {
                message: 'Global function error', exception: error
            }
        })
    }
})

app.post('/donate/payment/create', (req, resp) => {
    try {
        let json_body = req.body
        let url = url_builder_(
            'https://easydonate.ru/api/v3/shop/payment/create',
            [
                { "name": "customer", "value": json_body["customer"] },
                { "name": "server_id", "value": process.env.SERVER_ID },
                { "name": "products", "value": JSON.stringify(json_body["products"]) },
                { "name": "email", "value": json_body["email"] },
                { "name": "coupon", "value": json_body["coupon"] }
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
                console.log(body)
                console.log(json_body)
                console.log(url)
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body)
                    if (body.success) {
                        resp.send({
                            success: true,
                            payment: {
                                "url": body.response.url,
                                "bill_id": body.response.payment.id
                            } 
                        })
                    }
                    resp.send({
                        success: false,
                        message: "Error check response EasyDonate API",
                        exception: "var success is not true"
                    })
                } else {
                    resp.send({ success: false, message: 'Input function error', exception: error })
                }
            }
        )
    } catch (error) {
        resp.send({
            success: false,
            error_body: {
                message: 'Global function error', exception: error
            }
        })
    }
})

app.get('/server', (req, resp) => {
    try {
        const options = {
            timeout: 1000 * 3
        }
        function result_(data) {
            return {
                "online": data.players.online,
                "latency": data.roundTripLatency
            }
        }
        mcstatus.status('zalupa.online', 25565, options)
            .then((result) => resp.send({
                success: true, body: result_(result)
            }))
            .catch((error) => resp.send({
                success: false,
                error_body: {
                    message: 'Server data get error', exception: error
                }
            }))
    } catch (error) {
        resp.send({
            success: false,
            error_body: {
                message: 'Global function error', exception: error
            }
        })
    }
})

app.listen(app.get('port'), () => {
    console.log(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    console.error(`Uncaught exception: ${exception}`)
})

