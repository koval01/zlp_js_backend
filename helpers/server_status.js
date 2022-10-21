const mc_status = require("minecraft-server-util")
const {input_e} = require("./errors")

module.exports.mc_status_view = async (req, resp) => {
    mc_status.status('zalupa.online', 25565, {
        timeout: 1000
    })
        .then((result) => resp.send({
                success: true, body: {online: result.players.online}
            })
        )
        .catch((error) => input_e(resp, 503, error))
}