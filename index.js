'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const imdb = require('imdb-api')

const mdb = require('moviedb')(process.env.TMDBKEY);

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
  res.send('Hello, botworld!')
})

// Privacy policy page
app.get('/privacy/', function (req, res) {
  res.sendFile('privacy.html', { root : __dirname});
})

// Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === 'tvakis_verification') {
    res.send(req.query['hub.challenge'])
  }
  res.send('Error, wrong token')
})

// Define emojis
const emojis = {
  not_found: '🙄',
  sick: '🤢',
  heart: '❤️',
  sun: '😎',
  title_emj: '📺',
  plot_emj: '🎥',
  view_emj: '👉',
  aired_emj: '✈️ '
}

app.post('/webhook/', function (req, res) {
  // Destructuring
  const { title_emj, plot_emj, view_emj, aired_emj, sun, not_found, sick } = emojis;
  
  let messaging_events = req.body.entry[0].messaging
  // Loop through messaging events
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    // Get sender (user) info
    let sender = event.sender.id
    if (event.message && event.message.text) {
      // Parse actual text
      let text = event.message.text
      // Drop messaging if the message is bigger than usual
      if (text.length > 200) {
        sendTextMessage(sender, "Are you sure that's the name?" + not_found)
      } else {
        // Filter text
        text = text.toLowerCase()
        if (text == "hi" || text == "hey" || text == "hello") {
          sendTextMessage(sender, "Please give me a TV show or a movie!" + sun)
        } else {
          mdb.searchTv({ query: text }, (err, res) => {
            if (err) {
              console.log(err)
              return
            }
            sendTextMessage(sender, title_emj + " " + res.results[0].name)
            sendTextMessage(sender, plot_emj + " " + res.results[0].overview)
            console.log(res.results[0].name)
            // console.log(res.results[0].overview)
            mdb.tvInfo({ id: res.results[0].id }, (err, res) => {
              if (err) {
                console.log(err)
                return
              }
              mdb.tvSeasonInfo({ id: res.id, season_number: res.number_of_seasons }, (err, res) => {
                if (err) {
                  console.log(err)
                  return
                }
                let last_episode = res.episodes[res.episodes.length-2]
                let air_date = new Date(last_episode.air_date)
                // console.log(res.episodes[res.episodes.length-2])
                sendTextMessage(sender, aired_emj + "Last episode aired was \"" + last_episode.name + "\" on " + air_date.toDateString() + ".")
              })
            })
          })
        }
      }
    }
  }
  res.sendStatus(200)
})

function getCorrectEpisode(episodes) {
  let i = episodes.length - 1
  let episode = episodes[i]
  let ep_date = episode.released

  var today = new Date()
  
  // We do not want the last episode to be later than to day
  // or to have invalid date
  while (ep_date > today || ep_date == "Invalid Date") {
    episode = episodes[i]
    ep_date = episode.released
    i--
  }
  return episode
}

const token = process.env.FB_PAGE_ACCESS_TOKEN

// Handles messaging from server to bot
function sendTextMessage(sender, text) {
  let messageData = { text:text }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: {
      recipient: { id: sender },
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

function createGreetingMsgConnector(data) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: token },
    method: 'POST',
    json: data
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Greeting message set successfully!")
    } else {
      console.error("Failed to set greeting message!")
    }
  });
}

function setGreetingMsg() {
  var greetingMsgData = {
    setting_type: "greeting",
    greeting: {
      text: "Hi {{user_first_name}}, I'm TVakis! :D Give me the name of a TV show or movie and I'll search it for you!"
    }
  };
  createGreetingMsgConnector(greetingMsgData)
}

// Run server
app.listen(app.get('port'), function() {
  console.log('Running on port: ', app.get('port'))
  setGreetingMsg()
})