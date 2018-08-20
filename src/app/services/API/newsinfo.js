/*
https://cryptocontrol.io/api/v1/public?key=API_KEY_HERE

/api/v1/public/news

GET /api/v1/public/news/category

/api/v1/public/news/coin/:coin
/api/v1/public/news/coin/:coin/category
/api/v1/public/tweets/coin/:coin
/api/v1/public/feed/coin/:coin
 /api/v1/public/details/coin/:coin

 To showcase some of the awesome stuff that we hope people will be building with our APIs, we’re introducing the "CryptoControl Hall of fame" where we’ll be showcasing all the cool products that use the CryptoControl API.

Hall of famers will get special attention on the CryptoControl website and will also get a backlink from CryptoControl.

If you’d like to get recognised in our wall of fame, all you have to do is create something useful with the CryptoControl API and let us know about it (contact@cryptocontrol.io).

*/

const config = require('../../config/appConfig')

const cryptonewsapi = require('crypto-news-api').default
const api = new cryptonewsapi(config.cryptonews.apiKey)

// Connect to a self-hosted proxy server (to improve performance) that points to cryptocontrol.io
//const ProxyApi = new CryptoNewsAPI('API_KEY_HERE', 'http://cryptocontrol_proxy/api/v1/public')

// Get top news
module.exports = {
	topNews: () => api.getTopNews(),
  //  .then(function (articles) { console.log(articles) })
  //  .catch(function (error) { console.log(error) })

// Get latest russian news
/*Api.getTopNews("ru")
    .then(function (articles) { console.log(articles) })
    .catch(function (error) { console.log(error) })
*/
// Get top news for Bitcoin
	topNewsByCoin: coin => api.getTopNewsByCoin( coin ),
    //.then(function (articles) { console.log(articles) })
    //.catch(function (error) { console.log(error) })

// Get latest tweets for EOS
	latestTweetsByCoin: coin => api.getLatestTweetsByCoin( coin ),
    //.then(function (tweets) { console.log(tweets) })
    //.catch(function (error) { console.log(error) })

// Get latest reddit posts for Ripple
	latestRedditPostsByCoin: coin => api.getLatestRedditPostsByCoin( coin ),
  //  .then(function (redditPosts) { console.log(redditPosts) })
  //  .catch(function (error) { console.log(error) })

// Get a combined feed (reddit/twitter/articles) for Litecoin
	topFeedByCoin: coin => api.getTopFeedByCoin( coin ),
    //.then(function (feed) { console.log(feed) })
    //.catch(function (error) { console.log(error) })

// Get all reddit/tweets/articles (separated) for NEO
	topItemsByCoin: coin => api.getTopItemsByCoin( coin ),
  //  .then(function (feed) { console.log(feed) })
  //  .catch(function (error) { console.log(error) })

// Get coin details for ethereum
	coinDetails: coin => api.getCoinDetails( coin )
  //  .then(function (details) { console.log(details) })
  //  .catch(function (error) { console.log(error) })
}

