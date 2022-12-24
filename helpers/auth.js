const {get_player_auth} = require("../database/functions/get_player")
const {main_e} = require("./errors")


const getPlayerAuthData = async (req, resp) => {
    try {
        function response_call(result, cache = false) {
            return resp.send({
                success: true,
                cache: cache,
                payment: result
            })
        }

        get_player_auth(function (data) {
            return response_call(data, false)
        })
    } catch (_) {
        return main_e(resp)
    }
}

module.exports = {
    getPlayerAuthData
}