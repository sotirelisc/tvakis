'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const omdb = require('omdbapi')

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
  res.send('Hello, botworld!')
})

// Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === 'tvakis_verification') {
    res.send(req.query['hub.challenge'])
  }
  res.send('Error, wrong token')
})

app.post('/webhook/', function (req, res) {
  let messaging_events = req.body.entry[0].messaging
  // Loop through messaging events
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    // Get sender (user) info
    let sender = event.sender.id
    if (event.message && event.message.text) {
      // Parse actual text
      let text = event.message.text
      // Filter text
      text = text.toLowerCase()
      if (text == "hey" || text == "hello") {
        sendTextMessage(sender, "Please give me a TV show!")
      } else {
        omdb.search({
          search: text, 
          type: 'series'
        }).then(function (res) {
          console.log(res[0].title);
          sendTextMessage(sender, res[0].title)
        }).catch(console.error.bind(console));
      }
    }
  }
  res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN

function sendTextMessage(sender, text) {
  let messageData = { text:text }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

// Run server
app.listen(app.get('port'), function() {
  console.log('Running on port: ', app.get('port'))
})