function get_user_ip(req) {
    return req.headers['x-forwarded-for'].split(",\x20")[0].trim() || req.socket.remoteAddress
}

function get_current_server_time() {
    return Math.floor(new Date().getTime() / 1000)
}

function censorWord(str) {
    return str[0] + "*".repeat(3) + str.slice(-1);
}

function censorEmail(email) {
    const arr = email.split("@");
    return censorWord(arr[0]) + "@" + arr[1];
}

function url_builder_(base_url, submit_data_) {
    let url = new URL(base_url)
    for (let i = 0; i < submit_data_.length; i++) {
        url.searchParams.set(submit_data_[i].name, submit_data_[i].value)
    }
    return url.href
}

module.exports = {
    get_user_ip,
    get_current_server_time,
    censorEmail,
    url_builder_
}