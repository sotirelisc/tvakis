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
      if (text == "hi" || text == "hey" || text == "hello") {
        sendTextMessage(sender, "Please give me a TV show!")
      } else {
        omdb.search({
          search: text, 
          type: 'series'
        }).then(function (res) {
          omdb.get({
            id: res[0].imdbid
          }).then(function (res) {
            omdb.get({
              id: res.imdbid,
              season: res.totalseasons
            }).then(function (res) {
              let episodes_count = Object.keys(res.episodes).length
                for (let i=0; i<episodes_count; i++) {
                  if (res.episodes[i].title.includes("Episode") && res.episodes[i].released.substring(0, 4).includes("2017")) {
                    // console.log(res.episodes[i-1].title)
                    sendTextMessage(sender, res.episodes[i-1].title)
                    break
                  }
                }
              }).catch(console.error.bind(console));
          }).catch(console.error.bind(console));
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