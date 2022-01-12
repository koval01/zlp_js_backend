const request = require('request')
const compression = require('compression')
const cors = require('cors')
const express = require('express')
const mcstatus = require('minecraft-server-util')

const app = express()

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
app.use(compression())
app.use(cors())

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
          resp.send({ success: true, body: body })
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
      delete data.favicon
      delete data.version
      delete data.srvRecord
        
      delete data.motd.raw
      delete data.motd.clean
      delete data.players.sample
        
      return data
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

app.get('/neuro', (req, resp) => {
  try {
    request(
      {
        uri: `https://pelevin.gpt.dobro.ai/generate/`,
        method: 'POST',
        headers: {
          Origin: 'https://porfirevich.ru',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
          Connection: 'keep-alive',
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        json: {
          "prompt": "Залупа подарит незабываемые ощущения. Гляди и наслаждайся, пока есть возможность. У тебя есть уникальная возможность",
          // "num_samples": 5,
          "length": 30
        }
      },
      (error, response, body) => {
        if (!error && response.statusCode == 200) {
          body = body.replies
          let result = ""
          for (let i = 0; i < body.length; i++) {
            if (body[i].length > 5) {
              result = body[i]
              break
            }
          }
          resp.send({ success: result.length != 0, body: result, length_result: result.length })
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

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`)
})

