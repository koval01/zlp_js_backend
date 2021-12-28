const request = require('request')
const compression = require('compression')
const cors = require('cors')
const express = require('express')
var app = express()

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
app.use(compression())
app.use(cors())

app.get('/', function(req, resp) {
  try {
    request(
    {
      uri: `https://t.me/s/zalupa_history?before=${req.query.before}`,
      method: 'POST',
      headers: {
        'Origin': 'https://t.me',
        'Referer': 'https://t.me/s/zalupa_history',
        'Host': 't.me',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
        'X-Requested-With': 'XMLHttpRequest',
        'Connection': 'keep-alive'
      } 
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resp.send({"success": true, "body": body.replace("\"", "").replace("\\", "")})
      }
      else {
        resp.send({"success": false, "message": "Input function error", "exception": error})
      }    
    })
  } catch (error) {
    response.send({"success": false, "error_body": {
      "message": "Global function error", "exception": error
    }})
  }
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
