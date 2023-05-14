const main_e = (resp, error = "", message = "Main function error") => {
    return resp.status(503).json({
        success: false,
        message: message,
        exception: error
    })
}, input_e = (resp, code, error) => {
    return resp.status(code).json({
        success: false, message: "Input function error", exception: error
    })
}

module.exports = {
    main_e, input_e
}