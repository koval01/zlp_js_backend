require('dotenv').config()

const compression = require('compression')
const cors = require('cors')
const express = require('express')

const log = require("./helpers/log")
const {ip_get_view} = require("./helpers/methods")

const catchAsync = require("./helpers/catchAsync")
const {getHead} = require("./skin_renderer/controller/head")
const {get3dBody, get3dHead} = require("./skin_renderer/controller/render")

const {tg_check_view} = require("./helpers/telegram/base")
const {apiLimiter, methodLimiter} = require("./helpers/limiters")
const {global_error} = require("./middleware/other_middle")
const {re_check, tg_check} = require("./middleware/security_middle")
const {main_e} = require("./helpers/errors")

const static_view = require("./static")
const {crypto_view_, crypto_check_get} = require("./helpers/crypto")
const {mc_status_view} = require("./helpers/server_status")
const {promotion_view, t_monitoring_promotion} = require("./helpers/promotion")
const {getGiftPrivateServer} = require("./helpers/payment_img")
const {feedback_check_view, feed_send_view} = require("./helpers/feedback")
const {payment_create, payment_get, coupon_get, donate_services} = require("./helpers/donate")
const {events_view, channel_raw, channel_parse} = require("./helpers/telegram/channel")

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

app.post('/channel_get', methodLimiter, re_check, catchAsync(channel_parse))

app.post('/channel_parse', methodLimiter, re_check, catchAsync(channel_raw))

app.post('/events', methodLimiter, re_check, catchAsync(events_view))

app.post('/promotion', catchAsync(promotion_view))

app.post('/donate/services', methodLimiter, re_check, catchAsync(donate_services))

app.post('/donate/coupon', methodLimiter, re_check, catchAsync(coupon_get))

app.post('/donate/payment_get', methodLimiter, re_check, catchAsync(payment_get))

app.post('/donate/payment/create', methodLimiter, re_check, catchAsync(payment_create))

app.post('/feedback/send', methodLimiter, re_check, tg_check, catchAsync(feed_send_view))

app.post('/feedback/check', methodLimiter, re_check, tg_check, catchAsync(feedback_check_view))

app.post('/crypto', methodLimiter, re_check, catchAsync(crypto_view_))

app.post('/telegram/auth/check', methodLimiter, tg_check, tg_check_view)

app.get('/ip', catchAsync(ip_get_view))

app.get('/monitoringminecraft.ru', static_view.monitoring_minecraft_ru)

app.get('/tmonitoring_promotion', catchAsync(t_monitoring_promotion))

app.get('/profile/avatar', methodLimiter, catchAsync(getHead))

app.get('/profile/head', methodLimiter, catchAsync(get3dHead))

app.get('/profile/body', methodLimiter, catchAsync(get3dBody))

app.get('/gift/private_server', methodLimiter, crypto_check_get, catchAsync(getGiftPrivateServer))

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