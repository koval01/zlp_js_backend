function logError(err, req, res, next) {
    console.error(err)
    next()
}

function logRequest(req, res, next) {
    console.log(`Request: [${req.method}] ${req.url}`)
    next()
}

module.exports = {
    logError,
    logRequest
}