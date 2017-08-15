'use strict'

// Load emojis
let emoji = require('./emoji')

module.exports = (bot) => {
  bot.setPersistentMenu([{
    title: emoji.tv + ' TV Shows',
    type: 'nested',
    call_to_actions: [{
      type: 'postback',
      title: emoji.sun + ' Popular',
      payload: 'POPULAR_TV_PAYLOAD'
    }]
  }, {
    title: emoji.popcorn + ' Movies',
    type: 'nested',
    call_to_actions: [{
      type: 'postback',
      title: emoji.new_emj + ' Upcoming',
      payload: 'UPCOMING_MOVIES_PAYLOAD'
    }]
  }, {
    title: emoji.heart + ' More',
    type: 'nested',
    call_to_actions: [{
      type: 'postback',
      title: emoji.profile + ' About Me',
      payload: 'HELP_PAYLOAD'
    }, {
      type: 'postback',
      title: emoji.score + ' Help',
      payload: 'ABOUT_PAYLOAD'
    }]
  }], false)

  bot.setGreetingText("Welcome to TVakis! Your ultimate TV assistant!" + emoji.popcorn + "\n\nPress the button to learn more!" + emoji.down)
}
