require('dotenv').config()

const compression = require('compression')
const cors = require('cors')
const express = require('express')
const rateLimit = require('express-rate-limit')

const log = require("./helpers/log")

const catchAsync = require("./helpers/catchAsync")

const {tg_check_view} = require("./helpers/telegram/base")
const {apiLimiter, rateLimitMessage} = require("./helpers/limiters")
const {global_error} = require("./middleware/other_middle")
const {re_check, tg_check} = require("./middleware/security_middle")
const {main_e} = require("./helpers/errors")

const {crypto_view_, crypto_check, crypto_check_get} = require("./helpers/crypto")
const {mc_status_view} = require("./helpers/server_status")
const {payment_create, payment_get, coupon_get, donate_services} = require("./helpers/donate")
const {events_view} = require("./helpers/telegram/channel")

const app = express()

app.set('port', (process.env.PORT || 5000))
app.set('trust proxy', parseInt(process.env.PROXY_LAYER))

app.use(express.json())
app.use(express.urlencoded())
app.use(compression())
app.use(cors())

app.use(log.logError)

app.use(apiLimiter)
app.use(global_error)

app.post('/events', rateLimit({
    windowMs: 60 * 1000,
    max: 32,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(events_view))

app.post('/donate/services', rateLimit({
    windowMs: 60 * 1000,
    max: 32,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(donate_services))

app.post('/donate/coupon', rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(coupon_get))

app.post('/donate/payment/get', rateLimit({
    windowMs: 60 * 1000,
    max: 14,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_get))

app.post('/donate/payment/create', rateLimit({
    windowMs: 120 * 1000,
    max: 16,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(payment_create))

app.post('/crypto', rateLimit({
    windowMs: 60 * 1000,
    max: 72,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, catchAsync(crypto_view_))

app.post('/telegram/auth/check', rateLimit({
    windowMs: 60 * 1000,
    max: 48,
    standardHeaders: true,
    message: rateLimitMessage
}), re_check, tg_check, catchAsync(tg_check_view))

app.post('/server', rateLimit({
    windowMs: 60 * 1000,
    max: 24,
    standardHeaders: true,
    message: rateLimitMessage
}), crypto_check, catchAsync(mc_status_view))

app.all('*', async (_, resp) => {
    return main_e(resp, "error route", "This route cannot be found")
})

app.listen(app.get('port'), () => {
    console.debug(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
    console.error(exception.stack)
})