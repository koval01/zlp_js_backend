const request = require('request')
const compression = require('compression')
const cors = require('cors')
const express = require('express')
const mcstatus = require('minecraft-server-util')
const mc_client = require('minecraft-protocol')

const app = express()

const max_len_chat_array = 100

var chat_array = []
var trace_array = []

function mc_client_init() {
  const host = "zalupa.online"
  const port = 25565
  
  const username = "Xtillius@hotmail.com"
  const password = "felix1"
  
  const client = mc_client.createClient({
    host: host,
    port: port,
    username: username,
    password: password,
    auth: 'mojang'
  })
  
  var reconnect_interval
  
  function init_reconn() {
    reconnect_interval = setTimeout(function() { 
      client.connect(port, host)
      clearTimeout(reconnect_interval) 
    }, 5000)
  }
  
  client.on('success', (succ) => {
    clearTimeout(reconnect_interval)
    console.log(`MClient connected! Data: ${succ}`);
  })
  
  client.on('chat', function(packet) {
    if (chat_array.length > max_len_chat_array) { 
      chat_array.slice(-Math.abs(max_len_chat_array))
    }
    chat_array.push({
      "raw_msg": JSON.parse(packet.message), 
      "time_order": Math.floor(new Date() / 1000)
    })
  })
  
  client.on('login', function(packet) {
    console.log(`Message packet: ${packet.message}`)
    console.log(`Packet: ${packet}`)
  })
  
  client.on('error', (err) => {
    init_reconn()
    console.log(`MClient error: ${err}`)
  })
  
  client.on('position', (position) => {
    console.log(`Player position: ${position}`)
  })
  
  console.log(`Client username: ${client.username}`)
}

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

app.get('/gamechat', (req, resp) => {
  try {
    resp.send({
      success: chat_array.length != 0, body: chat_array
    })
  } catch (error) {
    resp.send({
      success: false,
      error_body: {
        message: 'Global function error', exception: error
      }
    })
  }
})

app.get('/trace', (req, resp) => {
  try {
    resp.send({
      success: trace_array.length != 0, body: trace_array
    })
  } catch (error) {
    resp.send({
      success: false,
      error_body: {
        message: 'Global function error', exception: error
      }
    })
  }
})

mc_client_init()

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`)
})

process.on('uncaughtException', function (exception) {
  const msg = `Uncaught exception: ${exception}`
  console.error(msg)
  trace_array.push({"msg": msg, "time_order": Math.floor(new Date() / 1000)})
})

