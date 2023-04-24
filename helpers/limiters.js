const rateLimit = require('express-rate-limit')

const rateLimitMessage = {
    success: false,
    error: "too many requests"
}

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 250,
    standardHeaders: true,
    message: rateLimitMessage
})

module.exports = {
    apiLimiter,
    rateLimitMessage
}