const {MemoryCache} = require('memory-cache-node')

const memoryCache = new MemoryCache(600, 1000000)

const memWrite = (key_name, key_value, expiring = 10 * 60) => {
    return memoryCache.storeExpiringItem(key_name, key_value, expiring)
}

const memGetValue = (key_name) => {
    return memoryCache.retrieveItemValue(key_name)
}

const memRemoveKey = (key_name) => {
    return memoryCache.removeItem(key_name)
}

const CFGeoGet = (req) => {
    return JSON.stringify(req.headers)
}

const utf8_to_b64 = (str) => {
    return Buffer.from(str, "utf8").toString("base64")
}

const b64_to_utf8 = (str) => {
    return Buffer.from(str, "base64").toString("utf8")
}

const get_user_ip = (req) => {
    return req.headers['x-forwarded-for'].split(",\x20")[0].trim() || req.socket.remoteAddress
}

const get_current_server_time = () => {
    return Math.floor(new Date().getTime() / 1000)
}

const censorWord = (str) => {
    return str[0] + "*".repeat(3) + str.slice(-1)
}

const censorEmail = (email) => {
    const arr = email.split("@")
    return censorWord(arr[0]) + "@" + arr[1]
}

const url_builder_ = (base_url, submit_data_) => {
    let url = new URL(base_url)
    for (let i = 0; i < submit_data_.length; i++) {
        url.searchParams.set(submit_data_[i].name, submit_data_[i].value)
    }
    return url.href
}

const ip_get_view = async (req, resp) => {
    return resp.send({success: true, ip: req.ip})
}

const getNoun = (number, one = "объект", two = "объекта", five = "объектов") => {
    let n = Math.abs(number)

    n %= 100
    if (n >= 5 && n <= 20) {
        return five
    }

    n %= 10
    if (n === 1) {
        return one
    }
    if (n >= 2 && n <= 4) {
        return two
    }
    return five
}

const generateHexID = () => {
    return parseInt(`${
        rand_int(99999999, 10000000)
    }${Date.now()}${
        rand_int(99999999, 10000000)
    }`).toString(16).slice(0, 16)
}

const rand_int = (max = 4, min = 1) => {
    return Math.floor(Math.random() * max) + min
}

const rand_bool = () => {
    return Math.round(Math.random())
}

const rand_move = (val) => {
    if (rand_bool()) {
        return val - rand_int()
    }
    return val + rand_int()
}

const removeItemOnce = (arr, value) => {
    let index = arr.indexOf(value)
    if (index > -1) {
        arr.splice(index, 1)
    }
}

module.exports = {
    get_user_ip,
    CFGeoGet,
    get_current_server_time,
    censorEmail,
    url_builder_,
    ip_get_view,
    getNoun,
    rand_int,
    rand_bool,
    rand_move,
    removeItemOnce,
    memWrite,
    memGetValue,
    memRemoveKey,
    utf8_to_b64,
    b64_to_utf8,
    generateHexID
}