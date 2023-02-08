const {input_e, main_e} = require("./errors")
const {url_builder_, censorEmail} = require("./methods")
const {encryptor, decrypt} = require("./crypto")
const {private_chat_data} = require("../database/functions/private_chat")
const {createInviteLinkPrivateChat, getVerifiedTelegramData} = require("./telegram/base")
const request = require("request")
const Redis = require("ioredis")
const {get_player_auth, get_private_server_license} = require("../database/functions/get_player");

const redis = new Redis(process.env.REDIS_URL)

const donate_services_internal = (callback) => {
    redis.get("services_internal_get", (error, result) => {
        if (error) throw error
        if (result !== null) {
            callback(JSON.parse(result))
        } else {
            request(
                {
                    uri: `https://easydonate.ru/api/v3/shop/products`,
                    method: 'GET',
                    headers: {
                        'Shop-Key': process.env.DONATE_API_KEY
                    }
                },
                (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        body = JSON.parse(body)
                        if (body.success) {
                            redis.set(
                                "services_internal_get",
                                JSON.stringify(body.response), "ex", 900
                            )
                            callback(body.response)
                        }
                    }
                    callback({})
                }
            )
        }
    })
}

const payment_create = async (req, resp) => {
    let json_body = req.body
    let server_id = decrypt(json_body.server_id)

    if (server_id) {
        server_id = parseInt(server_id)
        if (!Number.isInteger(server_id)) {
            return input_e(resp, 400, "server_id error")
        }
    } else {
        return input_e(resp, 400, "server_id error")
    }

    console.log(`paymentCreate: server_id=${server_id}`)
    try {
        const authData = getVerifiedTelegramData(json_body)
        const pay_methods = 2

        const zalupa_pay_processing = (player_data) => {
            get_private_server_license(function(whitelist_info) {
                if (whitelist_info.length) {
                    return input_e(resp, 400, "player already in list")
                }
                if (player_data["BALANCE"]) {
                    return input_e(resp, 400, "balance error")
                }

                donate_services_internal(function (products) {
                    for (let i = 0; i < products.length; i++) {
                        if (products[i].name.toLowerCase().includes("проходка")) {
                            if (products[i].price > player_data["BALANCE"]) {
                                return input_e(resp, 400, "balance is low")
                            } else {
                                return resp.send({
                                    success: true,
                                    payment: {zalupa_pay: true}
                                })
                            }
                        } else {
                            return input_e(resp, 400, "error product selector")
                        }
                    }
                })
            }, player_data["UUID"])
        }

        get_player_auth(function (data) {
            if (!data) {
                return input_e(resp, 400, "telegram auth error")
            }
            if (data["NICKNAME"] !== json_body.customer) {
                return input_e(resp, 400, "customer is not valid")
            }

            let products_stringified = JSON.stringify(json_body.products)
            if (Object.keys(json_body.products).length !== 1) {
                return input_e(resp, 400, "products error")
            }
            if (json_body.customer.length < 3 && json_body.customer.length > 32) {
                return input_e(resp, 400, "customer field error")
            }
            if (json_body.email.length < 3 && json_body.email.length > 50) {
                return input_e(resp, 400, "email field error")
            }
            if (json_body.pay_method < 1 || json_body.pay_method > pay_methods) {
                return input_e(resp, 400, "payment method error")
            }
            if (json_body.pay_method === 2) {
                return zalupa_pay_processing(data["NICKNAME"], data["UUID"])
            }
            let url = url_builder_(
                'https://easydonate.ru/api/v3/shop/payment/create',
                [
                    {name: "customer", value: json_body.customer},
                    {name: "server_id", value: server_id},
                    {name: "products", value: products_stringified},
                    {name: "email", value: json_body.email},
                    {name: "coupon", value: json_body.coupon},
                    {name: "success_url", value: json_body.success_url},
                ]
            )
            request(
                {
                    uri: url,
                    method: 'GET',
                    headers: {
                        'Shop-Key': process.env.DONATE_API_KEY
                    }
                },
                (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        body = JSON.parse(body)
                        if (body.success && body.response) {
                            const resp_api = body.response
                            return resp.send({
                                success: true,
                                payment: {
                                    url: resp_api.url,
                                    bill_id: resp_api.payment.id,
                                    zalupa_pay: false
                                }
                            })
                        }
                        return resp.status(503).json({
                            success: false,
                            message: "Error check response EasyDonate API",
                            exception: "var success is not true"
                        })
                    } else {
                        return input_e(resp, response.statusCode, error)
                    }
                }
            )
        }, authData.id)
    } catch (e) {
        console.error(e.stack)
        return main_e(resp)
    }
}

const getPaymentData = (json_body, callback) => {
    function response_(data) {
        if (data) {
            if (json_body.tokens_send) {
                let pattern = data.products[0].commands[0]
                let exc_com = data.sent_commands[0].command

                let split_pattern = pattern.split("\x20")
                let split_exc_com = exc_com.split("\x20")

                for (let i = 0; i < split_pattern.length; i++) {
                    if (split_pattern[i] === "{amount}") {
                        data.enrolled = parseInt(split_exc_com[i])
                    }
                }
            } else {
                data.enrolled = 0
            }
            data.status = (data.status === 2)
            let p = data.products[0]
            let private_inv = false
            if (p.name === "Проходка") {
                private_inv = true
            }
            return {
                id: data.id,
                customer: data.customer,
                email: censorEmail(data.email),
                created_at: data.created_at,
                payment_system: data.payment_system,
                status: data.status,
                enrolled: data.enrolled,
                product: {
                    name: p.name,
                    price: p.price,
                    type: p.type,
                    number: p.number,
                    description: p.description,
                    image: p.image
                },
                private_invite: private_inv
            }
        } else {
            return null
        }
    }

    function getInvite(callback, payment) {
        private_chat_data(function (db_resp) {
            if (payment.private_invite) {
                if (db_resp) {
                    console.log(`db_resp in payment_get : ${db_resp}`)
                    callback(`https://t.me/+${db_resp[0]["invite_id"]}`)
                } else {
                    createInviteLinkPrivateChat(function (invite_data) {
                        let inv_link = invite_data.invite_link
                        console.log(`invite_data(createInviteLinkPrivateChat) in payment_get : ${
                            inv_link}`)
                        private_chat_data(
                            function (_) {
                            },
                            payment.customer, inv_link.toString().match(/\/\+(.*)/)[1]
                        )
                        callback(inv_link)
                    })
                }
            } else {
                callback(null)
            }
        }, payment.customer)
    }

    redis.get(`payment_${json_body.payment_id}`, (error, result) => {
        if (error) {
            callback(null)
        }
        if (result !== null) {
            callback({data: JSON.parse(result), cache: true})
        } else {
            request(
                {
                    uri: `https://easydonate.ru/api/v3/shop/payment/${json_body.payment_id}`,
                    method: 'GET',
                    headers: {
                        'Shop-Key': process.env.DONATE_API_KEY
                    }
                },
                (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        body = JSON.parse(body)
                        if (body.success) {
                            let body_data = response_(body.response)
                            getInvite(function (inv_resp) {
                                console.log(`getInvite date : ${inv_resp}`)
                                body_data.private_invite = inv_resp
                                redis.set(
                                    `payment_${json_body.payment_id}`,
                                    JSON.stringify(body_data), "ex", 900
                                )
                                callback({data: body_data, cache: false})
                            }, body_data)
                        } else {
                            callback(null)
                        }
                    } else {
                        callback(null)
                    }
                }
            )
        }
    })
}

const getPaymentHistoryData = (json_body, callback) => {
    function response_(data) {
        if (data) {
            let result = [];
            // console.log(`payment_history array length : ${data.length}`)
            data = data.reverse();
            for (let i = 0; i < data.length; i++) {
                let p = data[i];
                let pi = p.products[0];
                if (p.status === 2 && result.length <= 30) {
                    result.push({
                        customer: p.customer,
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                        product: {
                            name: pi.name,
                            image: pi.image
                        }
                    })
                }
            }
            return result;
        } else {
            return null
        }
    }

    redis.get(`payment_history`, (error, result) => {
        if (error) {
            callback(null)
        }
        if (result !== null) {
            callback({data: JSON.parse(result), cache: true})
        } else {
            request(
                {
                    uri: `https://easydonate.ru/api/v3/shop/payments`,
                    method: 'GET',
                    headers: {
                        'Shop-Key': process.env.DONATE_API_KEY
                    }
                },
                (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        body = JSON.parse(body)
                        if (body.success) {
                            const body_data = response_(body.response)
                            redis.set(
                                `payment_history`,
                                JSON.stringify(body_data),
                                "ex", 15)
                            callback({data: body_data, cache: false})
                        } else {
                            callback(null)
                        }
                    } else {
                        callback(null)
                    }
                }
            )
        }
    })
}

const payment_history_get = async (req, resp) => {
    try {
        function response_call(result, cache = false) {
            return resp.send({
                success: true,
                cache: cache,
                payment: result
            })
        }

        getPaymentHistoryData(req.body, function (data) {
            if (data) {
                return response_call(data.data, data.cache)
            }
        })
    } catch (_) {
        return main_e(resp)
    }
}

const payment_get = async (req, resp) => {
    try {
        function response_call(result, cache = false) {
            return resp.send({
                success: true,
                cache: cache,
                payment: result
            })
        }

        getPaymentData(req.body, function (data) {
            if (data) {
                return response_call(data.data, data.cache)
            }
        })
    } catch (_) {
        return main_e(resp)
    }
}

const donate_services = async (req, resp) => {
    try {
        function response_call(data, cache = false) {
            return resp.send({
                cache: cache,
                success: true,
                services: data
            })
        }

        function response_(data) {
            let result = []
            for (let i = 0; i < data.length; i++) {
                if (!data[i].is_hidden) {
                    let f = data[i]
                    result.push({
                        id: f.id,
                        name: f.name,
                        description: f.description,
                        image: f.image,
                        price: f.price,
                        old_price: f.old_price,
                        type: f.type,
                        number: f.number,
                        server_id: encryptor(String(f.servers[0].id))
                    })
                }
            }
            return result
        }

        redis.get("donate_services", (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(response_(JSON.parse(result)), true)
            } else {
                request(
                    {
                        uri: `https://easydonate.ru/api/v3/shop/products`,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                let response_data = body.response
                                redis.set("donate_services", JSON.stringify(response_data), "ex", 600)
                                return response_call(response_(response_data))
                            }
                            return resp.status(503).json({
                                success: false,
                                message: "Error check response EasyDonate API",
                                exception: "var success is not true"
                            })
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
}

const coupon_get = async (req, resp) => {
    let json_body = req.body
    if (json_body.code.length > 35) {
        return input_e(resp, 400, "coupon is long")
    }
    if (json_body.pay_method === 2) {
        return input_e(resp, 400, "coupon not available for Zalupa Pay")
    }
    try {
        function response_call(data, cache = false) {
            return resp.send({
                cache: cache,
                success: !!data,
                coupon: data
            })
        }

        function response_(data) {
            if (data) {
                let products = data.products
                let products_list = []
                for (let i = 0; i < products.length; i++) {
                    products_list.push({
                        id: products[i].id,
                        name: products[i].name
                    })
                }
                return {
                    code: data.code,
                    discount: data.sale,
                    products: products_list

                }
            } else {
                return null
            }
        }

        function select_coupon(data, name) {
            if (data) {
                for (let i = 0; i < data.length; i++) {
                    if (data[i].code.toLowerCase() === name.toLowerCase()) {
                        return data[i]
                    }
                }
            }
            return null
        }

        redis.get(`coupon_${json_body.code}`, (error, result) => {
            if (error) throw error
            if (result !== null) {
                return response_call(JSON.parse(result), true)
            } else {
                request(
                    {
                        uri: `https://easydonate.ru/api/v3/shop/coupons?where_active=true`,
                        method: 'GET',
                        headers: {
                            'Shop-Key': process.env.DONATE_API_KEY
                        }
                    },
                    (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            body = JSON.parse(body)
                            if (body.success) {
                                let coupon_str = response_(select_coupon(body.response, json_body.code))
                                redis.set(`coupon_${json_body.code}`, JSON.stringify(coupon_str), "ex", 600)
                                return response_call(coupon_str)
                            }
                            return resp.status(503).json({
                                success: false,
                                message: "Error check response EasyDonate API",
                                exception: "var success is not true"
                            })
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
}

module.exports = {
    payment_create,
    payment_get,
    coupon_get,
    donate_services,
    payment_history_get,
    getPaymentData
}