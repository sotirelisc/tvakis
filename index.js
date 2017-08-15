'use strict'

const BootBot = require('bootbot')

if (!process.env.FB_ACCESS_TOKEN || !process.env.FB_VERIFY_TOKEN || !process.env.FB_APP_SECRET) {
  require('./env.js')
}

const bot = new BootBot({
  accessToken: process.env.FB_ACCESS_TOKEN,
  verifyToken: process.env.FB_VERIFY_TOKEN,
  appSecret: process.env.FB_APP_SECRET
})

const mdb = require('moviedb')(process.env.TMDBKEY)

// Load Persistent Menu, Greeting Text and set GetStarted Button
const menuAssets = require('./assets/menu')
bot.module(menuAssets)
bot.setGetStartedButton((payload, chat) => {
  chat.sendTypingIndicator(500).then(() => showIntro(chat))
})

// Load emojis
let emoji = require('./assets/emoji')

const poster_url = "https://image.tmdb.org/t/p/w640"

const showIntro = (chat) => {
  chat.getUserProfile().then((user) => {
    chat.say("Hi, " + user.first_name + "!" + emoji.waving + "\n\n" +
      "I'm TVakis, your movies & TV shows assistant!\nGive me a TV show or a movie (add the word 'movie' before title, for movies)!")
  })
}

const showAbout = (chat) => {
  chat.say(emoji.heart + "I am 1.1 versions old and was made by Christos Sotirelis in Greece! Send questions or feedback at: sotirelisc@gmail.com")
}

const showHelp = (chat) => {
  const help_msg = emoji.heart + " Hey there, I'm TVakis!"
                    + "\n" + emoji.tv + " You can give me the name of a TV show and I'll give you info about it. Like when the last episode was and when the new one is gonna be!"
                    + "\n" + emoji.popcorn + " I can also tell you about a movie if you add the word 'Movie' before its title!"
                    + "\n\n" + emoji.view_emj + " For example, type: movie interstellar"
                    + "\n" + emoji.camera + " Or just: game of thrones"
  chat.say(help_msg)
}

const showPopularTV = (chat) => {
  mdb.miscPopularTvs((err, res) => {
    if (!err) {
      let shows = []
      for (let i=0; i<10; i++) {
        shows.push({
          "title": res.results[i].name + " (" + res.results[i].vote_average + "/10)",
          "subtitle": res.results[i].overview,
          "image_url": poster_url + res.results[i].poster_path
        })
      }
      chat.sendGenericTemplate(shows)
    }
  })
}

const showUpcomingMovies = (chat) => {
  mdb.miscUpcomingMovies((err, res) => {
    if (!err) {
      let movies = []
      for (let i=0; i<10; i++) {
        movies.push({
          "title": res.results[i].title + " (" + res.results[i].vote_average + "/10)",
          "subtitle": res.results[i].overview,
          "image_url": poster_url + res.results[i].poster_path
        })
      }
      chat.sendGenericTemplate(movies)
    }
  })
}

const showPopularMovies = (chat) => {
  mdb.miscPopularMovies((err, res) => {
    if (!err) {
      let movies = []
      for (let i=0; i<10; i++) {
        movies.push({
          "title": res.results[i].title + " (" + res.results[i].vote_average + "/10)",
          "subtitle": res.results[i].overview,
          "image_url": poster_url + res.results[i].poster_path
        })
      }
      chat.sendGenericTemplate(movies)
    }
  })
}

const searchMovie = (chat, title) => {
  mdb.searchMovie({ query: title }, (err, res) => {
    if (err) {
      console.log(err)
    } else {
      if (res.results.length === 0) {
        chat.say("The movie was not found!" + emoji.not_found)
      } else {
        let movies_to_get = res.results.length
        // Show 5 (or less) relevant movies
        if (movies_to_get > 5) {
          movies_to_get = 5
        }

        let movies = []
        for (let i=0; i<movies_to_get; i++) {
          let release_date = new Date(res.results[i].release_date)
          movies.push({
            "title": res.results[i].title + " (" + release_date + " - " + res.results[i].vote_average + "/10)",
            "subtitle": res.results[i].overview,
            "image_url": poster_url + res.results[i].poster_path,
            "buttons": [{
              "type": "web_url",
              "url": "https://www.themoviedb.org/movie/" + res.results[0].id,
              "title": "Learn More",
              "webview_height_ratio": "tall"
            }]
          })
        }
      }
    }
  })
}

const searchTv = (chat, title) => {
  mdb.searchMovie({ query: title }, (err, res) => {
    if (err) {
      console.log(err)
    } else {
      if (res.results.length === 0) {
        chat.say("The movie was not found!" + emoji.not_found)
      } else {
        let movies_to_get = res.results.length
        // Show 5 (or less) relevant movies
        if (movies_to_get > 5) {
          movies_to_get = 5
        }

        let movies = []
        for (let i=0; i<movies_to_get; i++) {
          let release_date = new Date(res.results[i].release_date)
          movies.push({
            "title": res.results[i].title + " (" + release_date + " - " + res.results[i].vote_average + "/10)",
            "subtitle": res.results[i].overview,
            "image_url": poster_url + res.results[i].poster_path,
            "buttons": [{
              "type": "web_url",
              "url": "https://www.themoviedb.org/movie/" + res.results[0].id,
              "title": "Learn More",
              "webview_height_ratio": "tall"
            }]
          })
        }
      }
    }
  })
}

bot.on('message', (payload, chat) => {
  const fid = payload.sender.id
  console.log(fid)
  const text = payload.message.text.toLowerCase()

  if (text == "hi" || text == "hey" || text == "hello") {
    chat.sendTypingIndicator(500).then(() => showIntro(chat))
  } else {
    if (text.startsWith("movie ")) {
      let title = getTitleFromText(text)
      searchMovie(chat, title)
    } else {
      searchTv(chat, text)
    }
  }
})

// This is where all magic happens
app.post('/webhook/', function (req, res) {
  let messaging_events = req.body.entry[0].messaging
  // Loop through messaging events
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    // Get sender (user) info
    let sender = event.sender.id
    // Handle regular messages
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
          sendTextMessage(sender, "Hello! Please give me a TV show or a movie (add the word 'movie' before title)!" + hug, null)
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
                sendTextMessage(sender, "The movie was not found!" + not_found, null)
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
                sendTextMessage(sender, "The TV show was not found! If you're searching for a movie, add 'movie' before its title!" + not_found, null)
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
                  // If the last season has only 1 episode and later than today, then show upcoming season date
                  let temp_date = new Date(res.episodes[0].air_date)
                  if (res.episodes.length == 1 && temp_date > new Date()) {
                    sendTextMessage(sender, popcorn + " New season airs on " + temp_date.toDateString() + "!", null)
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

bot.on('postback:POPULAR_TV_PAYLOAD', (payload, chat) => {
  showPopularTV(chat)
})

bot.on('postback:UPCOMING_MOVIES_PAYLOAD', (payload, chat) => {
  showUpcomingMovies(chat)
})

bot.on('postback:POPULAR_MOVIES_PAYLOAD', (payload, chat) => {
  showPopularMovies(chat)
})

bot.on('postback:HELP_PAYLOAD', (payload, chat) => {
  showHelp(chat)
})

bot.on('postback:ABOUT_PAYLOAD', (payload, chat) => {
  showAbout(chat)
})

bot.start(process.env.PORT)
