const request = require("request"), html_parser = require("node-html-parser"), {input_e, main_e} = require("../errors"),
    Redis = require("ioredis"), redis = new Redis(process.env.REDIS_URL),
    // start context
    events_view = async (req, resp) => {
        try {
            function response_call(data, cache = false) {
                return resp.send({
                    cache: cache,
                    success: true,
                    events: data
                })
            }

            redis.get("game_events", (error, result) => {
                if (error) throw error
                if (result !== null) {
                    return response_call(JSON.parse(result), true)
                } else {
                    request(
                        {
                            uri: `https://t.me/s/${process.env.EVENTS_CHANNEL}`,
                            method: 'POST',
                            headers: {
                                Origin: 'https://t.me',
                                Referer: `https://t.me/s/${process.env.EVENTS_CHANNEL}`,
                                Host: 't.me',
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
                                'X-Requested-With': 'XMLHttpRequest',
                                Connection: 'keep-alive'
                            }
                        },
                        (error, response, body) => {
                            if (!error && response.statusCode === 200) {
                                body = body.toString().replace(/\\/gm, "")
                                let time_in_moscow = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Moscow"}))
                                let message_regex = /([\s\S]+)<br>(\d\d.\d\d.\d\d-\d\d:\d\d)\/(\d\d.\d\d.\d\d-\d\d:\d\d)<br>&#33;<br>([\s\S]+)/gm
                                let time_regex = /(\d\d).(\d\d).(\d\d)-(\d\d):(\d\d)/
                                let messages = html_parser.parse(body).querySelectorAll(".tgme_widget_message_wrap")
                                let result = []

                                let time_correction = function (date) {
                                    let userTimezoneOffset = date.getTimezoneOffset() * 60000
                                    return new Date(date.getTime() - userTimezoneOffset)
                                }

                                for (let i = 0; i < messages.length; i++) {
                                    let container = messages[i]
                                    let text_post = container.querySelector(".tgme_widget_message_text").innerHTML.toString()
                                    if (text_post.length) {
                                        let parsed_match = text_post.matchAll(message_regex)
                                        for (const parsed_ of parsed_match) {
                                            if (parsed_) {
                                                let date_st = parsed_[2].match(time_regex)
                                                let date_end = parsed_[3].match(time_regex)
                                                let defined_date_st = time_correction(new Date(`20${date_st[3]}`, date_st[2] - 1, date_st[1], date_st[4], date_st[5], '00'))
                                                let defined_date_end = time_correction(new Date(`20${date_end[3]}`, date_end[2] - 1, date_end[1], date_end[4], date_end[5], '00'))
                                                let to_start = ((time_in_moscow - defined_date_st) / 1000)
                                                let to_end = ((time_in_moscow - defined_date_end) / 1000)

                                                if ((to_start > 0 || -(to_start) < 259200) && (-(to_end) > 0 || to_end < 259200)) {
                                                    result.push({
                                                        title: parsed_[1],
                                                        date_start: defined_date_st.toJSON(),
                                                        date_end: defined_date_end.toJSON(),
                                                        text: parsed_[4]
                                                    })
                                                }
                                            }
                                        }
                                    }
                                }
                                if (result.length) {
                                    redis.set("game_events", JSON.stringify(result), "ex", 15)
                                    return response_call(result)
                                } else {
                                    return input_e(resp, 200, "result array is void")
                                }
                            } else {
                                return input_e(resp, response.statusCode, error)
                            }
                        }
                    )
                }
            })
        } catch (_) {
            return main_e(resp)
        }
    };


module.exports = {
    events_view
}