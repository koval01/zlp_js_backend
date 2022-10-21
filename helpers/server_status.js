const mc_status = require("minecraft-server-util")
const {main_e} = require("./errors")

module.exports.mc_status_view = async (req, resp) => {
    try {
        const options = {
            timeout: 1000 * 2
        }

        function result_(data) {
            return {
                online: data.players.online
            }
        }

        mc_status.status('zalupa.online', 25565, options)
            .then((result) => resp.send({
                success: true, body: result_(result)
            }))
            .catch((error) => resp.status(503).json({
                success: false,
                message: 'Server data get error',
                exception: error
            }))
    } catch (_) {
        return main_e(resp)
    }
    return resp.status(503).send(null)
}