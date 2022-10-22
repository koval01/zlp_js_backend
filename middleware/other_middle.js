const global_error = function (err, _, resp, next) {
    console.error(err.stack)
    next()
    return resp.status(500).json({
        success: false,
        message: "Internal server error",
        exception: "server error"
    })
}

module.exports = {
    global_error
}