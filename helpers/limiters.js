const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 250,
	standardHeaders: true,
    message: {
        success: false,
        error: "too many requests"
    }
})

module.exports = {
    apiLimiter
}