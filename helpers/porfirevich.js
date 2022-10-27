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

const getPorfirevich = async (text = "Вам нужно явится на Залупу для") => {
    for (let i = 0; i < 3; i++) {
        let body = await getResponsePorfirevich(text)
        let result = (body.data.replies[rand_int(2, 0)]).trim()
        if (result.length > 8 && result.length < 38) {
            return result
        }
    }
}

module.exports = {
    getPorfirevich
}