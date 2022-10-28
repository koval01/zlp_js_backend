const axios = require("axios")
const { rand_int } = require("./methods")

const getResponsePorfirevich = async (text) => {
    return await axios.post(
        'https://pelevin.gpt.dobro.ai/generate/',
        {
            length: 6, prompt: text
        }
    )
}

const getPorfirevich = async (text = "Вам нужно явится на Залупу для", error_paste = "") => {
    for (let i = 0; i < 3; i++) {
        let body = await getResponsePorfirevich(text)
        let replies = body.data.replies
        for (let j = 0; j < replies.length; j++) {
            let result = (replies[j]).trim()
            let len = result.length
            if (
                len > 8 && len < 38 &&
                !result.includes("—") &&
                !result.slice(-1) === "," &&
                !result.split(
                    "\x20")
                    .slice(-1)
                    .toString()
                    .length <= 2
            ) {
                return result
            }
        }
    }
    return error_paste
}

module.exports = {
    getPorfirevich
}