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

const {crypto_view_, crypto_check, crypto_check_get} = require("./helpers/crypto")
const {mc_status_view} = require("./helpers/server_status")
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

app.post('/channel_parse', rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(channel_raw))

app.post('/events', rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(events_view))

app.post('/donate/services', rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(donate_services))

app.post('/donate/coupon', rateLimit({
    windowMs: 60 * 1000,
    max: 30,
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
    max: 60,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_history_get))

app.post('/donate/payment/create', rateLimit({
    windowMs: 120 * 1000,
    max: 45,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_create))

app.post('/crypto', rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(crypto_view_))

app.post('/telegram/auth/check', rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, tg_check, catchAsync(tg_check_view))

app.get('/ip', catchAsync(ip_get_view))

app.get('/profile/avatar', rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    message: rateLimitMessage
}), crypto_check_get, catchAsync(getHead))

app.get('/profile/head', rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    message: rateLimitMessage
}), crypto_check_get, catchAsync(get3dHead))

app.post('/server', rateLimit({
    windowMs: 60 * 1000,
    max: 90,
    standardHeaders: true,
    message: rateLimitMessage
}), crypto_check, catchAsync(mc_status_view))

app.get('*', async (_, resp) => {
    return main_e(resp, "error route", "This route cannot be found")
})

app.listen(app.get('port'), () => {
    console.debug(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    console.error(exception.stack)
})