const axios = require("axios")

const getResponsePorfirevich = async (text, tokens) => {
    return await axios.post(
        'https://pelevin.gpt.dobro.ai/generate/',
        {
            length: tokens, prompt: text
        }
    )
}

const getPorfirevich = async (
    text = "Вам нужно явится на Залупу для",
    error_paste = "",
    tokens=6
) => {
    for (let i = 0; i < 3; i++) {
        let body = await getResponsePorfirevich(text, tokens)
        let replies = body.data.replies
        for (let result of replies) {
            result = result.trim()
            let len = result.length
            if (
                len > 8 && len < 38 &&
                result.slice(-1) !== "," &&
                !result.includes("—") &&
                result.split(
                    "\x20")
                    .slice(-1)
                    .toString()
                    .length > 3
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