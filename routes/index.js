const tweetController = require('../controllers/tweetController.js')

module.exports = (app) => {
  app.get('/tweets', tweetController.getTweets)
}