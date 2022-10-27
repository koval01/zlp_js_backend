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
    const body = await getResponsePorfirevich(text)
    return (body.data.replies[rand_int(2, 0)]).trim()
}

module.exports = {
    getPorfirevich
}