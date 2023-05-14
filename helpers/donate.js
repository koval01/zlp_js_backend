const {input_e, main_e} = require("./errors"), {
        url_builder_,
        censorEmail,
        getNoun,
        get_user_country_code,
        get_user_ip
    } = require("./methods"), {
        encryptor,
        decrypt
    } = require("./crypto"), {getVerifiedTelegramData} = require("./telegram/base"), request = require("request"),
    axios = require("axios"), Redis = require("ioredis"), {
        get_player_auth, get_private_server_license, get_player_tokens,
        add_private_server_license, add_token_transaction
    } = require("../database/functions/get_player"), redis = new Redis(process.env.REDIS_URL),
    // start context
    donate_services_internal = (callback) => {
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
    }, payment_create = async (req, resp) => {
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

        console.debug(`paymentCreate: server_id=${server_id}`)
        try {
            const authData = getVerifiedTelegramData(json_body)

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

                donate_services_internal(function (products) {
                    let lock_whitelist = true
                    for (let i = 0; i < products.length; i++) {
                        if (/проходка/.test(products[i].name.toLowerCase())) {
                            lock_whitelist = false
                        }
                    }
                }, data["UUID"])

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
                                        bill_id: resp_api.payment.id
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
    }, getPaymentData = (json_body, callback) => {
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
                                redis.set(
                                    `payment_${json_body.payment_id}`,
                                    JSON.stringify(body_data), "ex", 900
                                )
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
    }, payment_get = async (req, resp) => {
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
    }, donate_services = async (req, resp) => {
        const geo = get_user_country_code(req)
        const ip = get_user_ip(req)
        console.log(`Get donate services for geo: ${geo} (IP: ${ip})`)
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
    }, coupon_get = async (req, resp) => {
        let json_body = req.body
        if (json_body.code.length > 35) {
            return input_e(resp, 400, "coupon is long")
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
    getPaymentData
}