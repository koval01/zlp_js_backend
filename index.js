const compression = require('compression')
const express = require('express')
var app = express()

app.set('port', (process.env.PORT || 5000))
app.use(express.json())
app.use(compression())

app.get('/', function(request, response) {
  try {
      response.send({"success": false, "message": "Input function error", "exception": null})
  } catch (error) {
    response.send({"success": false, "error_body": {
      "message": "Global function error", "exception": error
    }})
  }
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
