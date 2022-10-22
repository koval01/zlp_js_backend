const crypto = require("crypto")
const {secrets} = require("../vars")
const {monitoring_statistic} = require("../database/functions/monitoring")
const {promotions_sql} = ("../database/functions/promotion")
const request = require("request")

const promotion_view = async (req, resp) => {
    let body = req.body
    resp.set("Content-Type", "text/html")

    if (!req.query.monitoring) {
        return resp.send("Не указан мониторинг")
    }

    let get_mon_ = () => {
        for (let i = 0; i < monitorings.length; i++) {
            if (req.query.monitoring === monitorings[i].name) {
                return monitorings[i]
            }
        }
    }

    let permission_ident = get_mon_()["permission"]
    if (!permission_ident) {
        return resp.send("Неверно указан мониторинг")
    }

    if (!body.username || !body.ip || !body.timestamp || !body.signature) {
        return resp.send("Присланы не все данные, вероятно запрос подделан")
    }

    let shasum = crypto.createHash('sha1')
    shasum.update(body.username + body.timestamp + secrets[get_mon_()["name"]])
    let signature = shasum.digest('hex')

    if (body.signature !== signature) {
        return resp.send("Неверная подпись / секретный ключ")
    }

    let stat = () => {
        monitoring_statistic(get_mon_()["name"], body.username)
    }

    promotions_sql(resp, body, stat(), permission_ident)
}

const t_monitoring_promotion = async (req, resp) => {
    let body = req.query
    let api_host = "https://tmonitoring.com/api/check/"
    resp.set("Content-Type", "text/html")

    let get_data = (callback) => {
        request(
            {
                uri: `${api_host}/${body.hash}?id=${body.id}`,
                method: "GET",
            },
            (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    body = JSON.parse(body)
                    callback(body)
                } else {
                    callback({})
                }
            }
        )
    }

    get_data(function (api_resp) {
        if (api_resp) {
            if (api_resp.hash !== 32 || body.hash !== 32 || api_resp.hash !== body.hash) {
                resp.send("Invalid hash")
            }
            body.username = api_resp.username
            // give award
            return resp.send("ok")
        }
        return resp.send("Error")
    })
}

module.exports = {
    promotion_view,
    t_monitoring_promotion
}