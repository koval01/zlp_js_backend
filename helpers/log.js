const logError = (err, req, res, next) => {
    console.error(err)
    next()
}

module.exports = {
    logError
}