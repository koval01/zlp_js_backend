const {rand_int} = require("../methods")

const randomPublisher = () => {
    const list = [
        {
            rank: "Генералиссимус",
            name: "bratishkinOFF"
        },
        {
            rank: "Генерал-Полковник",
            name: "_AppleTony_"
        },
        {
            rank: "Генерал-Лейтенант",
            name: "lomaka"
        },
        {
            rank: "Генерал-Майор",
            name: "mazellovvv"
        },
        {
            rank: "Полковник",
            name: "CREXLIGHT"
        },
        {
            rank: "Подполковник",
            name: "v0kky"
        },
        {
            rank: "Майор",
            name: "Fokzw"
        },
        {
            rank: "Капитан",
            name: "laefye"
        }
    ]
    return list[rand_int(list.length - 1, 0)]
}

module.exports = {
    randomPublisher
}