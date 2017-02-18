'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

const mdb = require('moviedb')(process.env.TMDBKEY);

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

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
  aired_emj: '✈️ ',
  popcorn: '🍿',
  link: '🔗',
  film: '🎞️'
}

// Destructuring emojis
const { title_emj, plot_emj, aired_emj, sun, not_found, popcorn, film, link, heart, view_emj } = emojis;
  
const help_msg = heart + " Hey there, I'm TVakis!"
                  + "\n" + title_emj + " You can give me the name of a TV show and I'll give you info about it. Like when the last episode was and when the new one is gonna be!"
                  + "\n" + popcorn + " I can also tell you about a movie if you add the word 'Movie' before its title!"
                  + "\n\n" + view_emj + " For example, type: movie interstellar"
                  + "\n" + plot_emj + " Or just: game of thrones"
                  
const about_msg = "I am 1.1 versions old and was made by Christos Sotirelis in Greece! Send questions or feedback at: sotirelisc@gmail.com"

// This is where all magic happens
app.post('/webhook/', function (req, res) {
  let messaging_events = req.body.entry[0].messaging
  // Loop through messaging events
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    // Get sender (user) info
    let sender = event.sender.id
    // Handle postbacks (for example, from persistent menu)
    if (event.postback) {
      if (event.postback.payload == "HELP_PAYLOAD") {
        sendTextMessage(sender, help_msg, null)
      } else if (event.postback.payload == "ABOUT_PAYLOAD") {
        sendTextMessage(sender, about_msg, null)
      }
      continue
    }
    if (event.message && event.message.text) {
      // Parse actual text
      let text = event.message.text
      // Drop messaging if the message is bigger than usual
      if (text.length > 200) {
        sendTextMessage(sender, "Are you sure that's the name?" + not_found, null)
      } else {
        // Filter text
        text = text.toLowerCase()
        if (text == "hi" || text == "hey" || text == "hello") {
          sendTextMessage(sender, "Hello! Please give me a TV show or a movie!" + sun, null)
        // Help command
        } else if (text == "/help") {
          sendTextMessage(sender, help_msg, null)
        } else {
          let title
          // We're searching for movies
          if (text.startsWith("movie ")) {
            title = getTitleFromText(text)
            mdb.searchMovie({ query: title }, (err, res) => {
              if (err) {
                console.log(err)
                return
              }
              if (res.results.length === 0) {
                sendTextMessage(sender, "The TV show or movie was not found!" + not_found, null)
                return
              }
              sendTextMessage(sender, title_emj + " " + res.results[0].title + " (" + res.results[0].vote_average + " average)\n" + plot_emj + " " + res.results[0].overview.substring(0, 550) + "..", null)
              let release_date = new Date(res.results[0].release_date)
              sendTextMessage(sender, film + " " + res.results[0].title + " was released on " + release_date.getFullYear() + ".\n" + link + " More info at: https://www.themoviedb.org/movie/" + res.results[0].id, null)
            })
          // We're searching for TV shows
          } else {
            mdb.searchTv({ query: text }, (err, res) => {
              if (err) {
                console.log(err)
                return
              }
              if (res.results.length === 0) {
                sendTextMessage(sender, "The TV show or movie was not found!" + not_found, null)
                return
              }
              console.log(res.results[0].name)
              mdb.tvInfo({ id: res.results[0].id }, (err, res) => {
                if (err) {
                  console.log(err)
                  return
                }
                // Split the overview in 2 messages if more than 550 chars (Facebook allows 640 chars message max)
                if (res.overview.length > 550) {
                  sendTextMessage(sender, title_emj + " " + res.name + " (" + res.vote_average + " average)\n" + plot_emj + " " + res.overview.substring(0, 550) + "..",
                    sendTextMessage(sender, ".." + res.overview.substring(550, 1000), null))
                } else {
                  sendTextMessage(sender, title_emj + " " + res.name + " (" + res.vote_average + " average)\n" + plot_emj + " " + res.overview, null)
                }
                console.log(res.name)
                // Find correct last season
                let last_season = res.number_of_seasons
                let last_season_date = new Date(res.seasons[last_season-1].air_date)
                let today = new Date()
                if (last_season_date > today) {
                  last_season--;
                }
                // Query last season's episodes
                mdb.tvSeasonInfo({ id: res.id, season_number: last_season }, (err, res) => {
                  if (err) {
                    console.log(err)
                    return
                  }
                  // Get show's last episode (if exists)
                  let last_episode = getCorrectLastEpisode(res)
                  let air_date = new Date(last_episode[0].air_date)
                  let last_str = "Last episode aired was \"" + last_episode[0].name + "\" on " + air_date.toDateString() + "."
                  // Get show's next episode (if exists)
                  let next_episode
                  let episode_number = last_episode[1]
                  if (episode_number < res.episodes.length) {
                    next_episode = res.episodes[episode_number+1]
                    let next_episode_air = new Date(next_episode.air_date)
                    let today = new Date()
                    if (next_episode_air == today) {
                      last_str = last_str + "\n" + popcorn + " New episode airs today!"
                    } else {
                      last_str = last_str + "\n" + popcorn + " New episode airs in " + getDaysDifference(today, next_episode_air) + " day(s) ("+ next_episode_air.toDateString() + ")!"
                    }
                    last_str = last_str + "\n" + view_emj + " " + next_episode.overview
                  }
                  sendTextMessage(sender, aired_emj + last_str, null)
                })
              })
            })
          }
        }
      }
    }
  }
  res.sendStatus(200)
})

// Calculates the days difference between two dates
function getDaysDifference(date1, date2) {
  let timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// It actually removes 'movie' string from title
function getTitleFromText(text) {
  return text.substring(6, text.length)
}

function getCorrectLastEpisode(res) {
  let i = res.episodes.length-1
  let episode = res.episodes[i]
  let ep_date = new Date(episode.air_date)

  var today = new Date()
  
  // We do not want the last episode to be later than today
  // Go to the previous one
  while (ep_date > today) {
    episode = res.episodes[i]
    ep_date = new Date(episode.air_date)
    i--
  }
  // Also return the position of the last episode
  return [episode, i+1]
}

const token = process.env.FB_PAGE_ACCESS_TOKEN

// Handles messaging from server to bot
function sendTextMessage(sender, text, next) {
  let messageData = { text: text }
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
    } else {
      if (next == null) return
      return next()
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
      text: "Hi {{user_first_name}}, I'm TVakis! Give me the name of a TV show or add 'movie' before a movie title and I'll search it for you! For help, type /help"
    }
  };
  createGreetingMsgConnector(greetingMsgData)
}

function persistentMenu() {
  request({
    url: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: token },
    method: 'POST',
    json: {
      setting_type: "call_to_actions",
      thread_state: "existing_thread",
      call_to_actions: [
        {
          type: "postback",
          title: "Help",
          payload: "HELP_PAYLOAD"
        },
        {
          type: "postback",
          title: "About Me",
          payload: "ABOUT_PAYLOAD"
        },
        {
          type: "web_url",
          title: "Powered by TheMovieDB",
          url: "https://www.themoviedb.org"
        }
      ]
    }
  }, function(error, response, body) {
    console.log(response)
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
  setGreetingMsg()
  persistentMenu()
})