const {getVerifiedTelegramData} = require("./telegram/base")
const {input_e} = require("./errors")
const Redis = require("ioredis")
const request = require("request")
const qs = require("querystring")

const redis = new Redis(process.env.REDIS_URL)

const feedback_check_view = async (req, resp) => {
    let tg_user = getVerifiedTelegramData(req.body)
    // console.log(tg_user)
    redis.get(`feedback_${req.ip}_tg${tg_user.id}`, (error, result) => {
        if (error) throw error
        if (result !== null) {
            return input_e(resp, resp.statusCode, "need wait")
        } else {
            return resp.json({
                success: true
            })
        }
    })
}

const feed_send_view = async (req, resp) => {
    let json_body = req.body
    let tg_user = getVerifiedTelegramData(json_body)
    const remove_repeats = (text) => {
        let arr = text.split("\x20")
        let newArr = []
        let last = null
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== last) {
                newArr.push(arr[i])
            }
            last = arr[i]
        }
        return newArr.join("\x20")
    }
    redis.get(`feedback_${req.ip}_tg${tg_user.id}`, (error, result) => {
        if (error) throw error
        if (result !== null) {
            return input_e(resp, 429, "need wait")
        } else {
            let text = json_body.text
            const text_c = text
            if (text && text.length > 10 && text.length <= 3001) {
                text = text.replaceAll(/<.*?>/gm, "").trim().match(/['!"#$%&()*+,\-.\/:;<=>?@\[\]^_{|}~\w\u0430-\u044f]+/ig).join("\x20").trim()
                text = remove_repeats(text)
                if (text.length !== text_c.length) {
                    return input_e(resp, 403, "text field check error")
                }
                let username = (tg_user.username && tg_user.username.length) ? `(@${tg_user.username})` : ""
                tg_user.last_name ? tg_user.last_name : ""
                let user_name_builded = `<a href="tg://user?id=${tg_user.id}">${tg_user.first_name} ${tg_user.last_name}</a> ${username}`
                request(
                    {
                        uri: `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${process.env.PRIVATE_CHAT_ID}&${qs.stringify({
                            text: `${text}\n\n${"_".repeat(10)}\n${user_name_builded}\n\nTG_ID:\x20${tg_user.id}\nIP:\x20<tg-spoiler>${req.ip}</tg-spoiler>`
                        })}&parse_mode=HTML`,
                        method: 'GET'
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.ok) {
                                redis.set(`feedback_${req.ip}_tg${tg_user.id}`, "ok", "ex", 60)
                                return resp.json({
                                    success: true
                                })
                            }
                            return input_e(resp, response.statusCode, "telegram api error")
                        } else {
                            return input_e(resp, response.statusCode, error)
                        }
                    }
                )
            } else {
                return input_e(resp, 400, "text not valid")
            }
        }
    })
}

module.exports = {
    feedback_check_view,
    feed_send_view
}