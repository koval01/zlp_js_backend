require('dotenv').config()

const compression = require('compression')
const cors = require('cors')
const express = require('express')
const rateLimit = require('express-rate-limit')

const log = require("./helpers/log")
const {ip_get_view} = require("./helpers/methods")

const catchAsync = require("./helpers/catchAsync")
const {getHead} = require("./skin_renderer/controller/head")
const {get3dHead} = require("./skin_renderer/controller/render")

const {tg_check_view} = require("./helpers/telegram/base")
const {apiLimiter, rateLimitMessage} = require("./helpers/limiters")
const {global_error} = require("./middleware/other_middle")
const {re_check, tg_check} = require("./middleware/security_middle")
const {main_e} = require("./helpers/errors")

const static_view = require("./static")
const {crypto_view_, crypto_check, crypto_check_get} = require("./helpers/crypto")
const {mc_status_view} = require("./helpers/server_status")
const {promotion_view, t_monitoring_promotion} = require("./helpers/promotion")
const {getSkinsData} = require("./helpers/skins")
const {payment_create, payment_get, coupon_get, donate_services, payment_history_get} = require("./helpers/donate")
const {events_view, channel_raw} = require("./helpers/telegram/channel")

const app = express()

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

// app.post('/channel_get', rateLimit({
//     windowMs: 60 * 1000,
//     max: 20,
//     standardHeaders: true,
//     message: rateLimitMessage
// }), re_check, catchAsync(channel_parse))

app.post('/channel_parse', rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(channel_raw))

app.post('/events', rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(events_view))

app.post('/promotion', rateLimit({
    windowMs: 60 * 1000,
    max: 90,
    standardHeaders: true,
    message: rateLimitMessage
}), catchAsync(promotion_view))

app.post('/donate/services', rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(donate_services))

app.post('/donate/coupon', rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(coupon_get))

app.post('/donate/payment_get', rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_get))

app.post('/donate/payment_history', rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_history_get))

app.post('/donate/payment/create', rateLimit({
    windowMs: 120 * 1000,
    max: 30,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_create))

// app.post('/feedback/send', rateLimit({
//     windowMs: 60 * 1000,
//     max: 10,
//     standardHeaders: true,
//     message: rateLimitMessage
// }), re_check, catchAsync(feed_send_view))
//
// app.post('/feedback/check', rateLimit({
//     windowMs: 60 * 1000,
//     max: 50,
//     standardHeaders: true,
//     message: rateLimitMessage
// }), re_check, catchAsync(feedback_check_view))

app.post('/crypto', rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(crypto_view_))

app.post('/telegram/auth/check', rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    message: rateLimitMessage
}), tg_check, catchAsync(tg_check_view))

app.post('/profile/skins/get', rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(getSkinsData))

app.get('/ip', catchAsync(ip_get_view))

app.get('/monitoringminecraft.ru', static_view.monitoring_minecraft_ru)

app.get('/tmonitoring_promotion', catchAsync(t_monitoring_promotion))

app.get('/profile/avatar', rateLimit({
    windowMs: 60 * 1000,
    max: 80,
    standardHeaders: true,
    message: rateLimitMessage
}), catchAsync(getHead)) // crypto_check_get

app.get('/profile/head', rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    message: rateLimitMessage
}), crypto_check_get, catchAsync(get3dHead))

// app.get('/profile/body', rateLimit({
//     windowMs: 60 * 1000,
//     max: 5,
//     standardHeaders: true,
//     message: rateLimitMessage
// }), catchAsync(get3dBody))

// app.get('/gift/private_server', rateLimit({
//     windowMs: 180 * 1000,
//     max: 10,
//     standardHeaders: true,
//     message: rateLimitMessage
// }), crypto_check_get, catchAsync(getGiftPrivateServer))

app.post('/server', rateLimit({
    windowMs: 60 * 1000,
    max: 45,
    standardHeaders: true,
    message: rateLimitMessage
}), crypto_check, catchAsync(mc_status_view))

app.get('*', async (_, resp) => {
    return main_e(resp, "error route", "This route cannot be found")
})

app.listen(app.get('port'), () => {
    console.log(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    console.error(exception.stack)
})