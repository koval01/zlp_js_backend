const rateLimit = require('express-rate-limit'), rateLimitMessage = {
    success: false,
    error: "too many requests"
}, apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 250,
    standardHeaders: true,
    message: rateLimitMessage
})


module.exports = {
    apiLimiter, rateLimitMessage
}