const request = require('request')
const compression = require('compression')
const cors = require('cors')
const html_parser = require('node-html-parser')
const express = require('express')
const rateLimit = require('express-rate-limit')
const mcstatus = require('minecraft-server-util')

const app = express()

const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 100, // Max 100 requests per 1 minute
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
app.use(compression())
app.use(cors())
app.use(limiter)

app.get('/channel', (req, resp) => {
  try {
    const choice_ = ['zalupa_history', 'zalupaonline']
    request(
      {
        uri: `https://t.me/s/${choice_[req.query.choice]}?before=${req.query.before}`,
        method: 'POST',
        headers: {
          Origin: 'https://t.me',
          Referer: `https://t.me/s/${choice_[req.query.choice]}`,
          Host: 't.me',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
          'X-Requested-With': 'XMLHttpRequest',
          Connection: 'keep-alive'
        }
      },
      (error, response, body) => {
        if (!error && response.statusCode == 200) {
          body = body.toString().replace(/\\/gm, "")
          const regex = /data-post="[A-z\d_-]*\/[\d]*"/gm
          const matched = body.match(regex)
          resp.send({ 
            success: true, 
            last_post: matched[matched.length - 1].match(/data-post="([A-z\d_-]*\/[\d]*)"/)[1]
          })
        } else {
          resp.send({ success: false, message: 'Input function error', exception: error })
        }
      }
    )
  } catch (error) {
    resp.send({
      success: false,
      error_body: {
        message: 'Global function error', exception: error
      }
    })
  }
})

app.get('/donate/services', (req, resp) => {
  try {
    request(
      {
        uri: `https://easydonate.ru/api/v3/shop/products`,
        method: 'GET',
        headers: {
          'Shop-Key': process.env.DONATE_API_KEY
        }
      },
      (error, response, body) => {
        if (!error && response.statusCode == 200) {
          // ...
          resp.send({ 
            success: true, 
            services: body
          })
        } else {
          resp.send({ success: false, message: 'Input function error', exception: error })
        }
      }
    )
  } catch (error) {
    resp.send({
      success: false,
      error_body: {
        message: 'Global function error', exception: error
      }
    })
  }
})

app.get('/server', (req, resp) => {
  try {
    const options = {
      timeout: 1000 * 3
    }
    function result_(data) {
      return {
	"online": data.players.online,
	"latency": data.roundTripLatency
      }
    }
    mcstatus.status('zalupa.online', 25565, options)
      .then((result) => resp.send({ 
        success: true, body: result_(result) 
      }))
      .catch((error) => resp.send({
        success: false,
        error_body: {
          message: 'Server data get error', exception: error
        }
      }))
  } catch (error) {
    resp.send({
      success: false,
      error_body: {
        message: 'Global function error', exception: error
      }
    })
  }
})

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
  console.error(`Uncaught exception: ${exception}`)
})

