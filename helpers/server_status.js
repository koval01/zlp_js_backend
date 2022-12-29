const mc_status = require("minecraft-server-util")
const {input_e} = require("./errors")

const get_status = (callback, only_online=true) => {
    mc_status.status('zalupa.online', 25565, {
        timeout: 300
    })
        .then((result) => callback({
                success: true, body: only_online ? {
                    online: result.players.online
                } :{
                    motd: {
                        clean: result.motd.clean,
                        html: result.motd.html
                    },
                    players: {
                        max: result.players.max,
                        online: result.players.online
                    }
                }
            })
        )
        .catch((error) => callback({success: false, error: error}))
}

const mc_status_view = async (req, resp) => {
    get_status(function (status_) {
        return resp.send(status_)
    })
}

const mc_status_view_full = async (req, resp) => {
    get_status(function (status_) {
        return resp.send(status_)
    }, false)
}

module.exports = {
    mc_status_view,
    mc_status_view_full
}