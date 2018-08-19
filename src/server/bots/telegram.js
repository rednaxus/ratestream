//this is telegram

const TelegramBot = require('node-telegram-bot-api')
const { InlineKeyboard, ReplyKeyboard, ForceReply } = require('telegram-keyboard-wrapper')

const { translate } = require('../nlp')

var app = require('../application')
const formatters = require('./formatters')

var { tokens, users, rounds, questions, reviews, scripts } = app.data

app.start()

//app.refreshTokens() // can do this on regular interval

console.log('users:',users)

/* nlp tests */
var t = translate('dinosaur').nouns().toPlural()

console.log( t.out('text') )

var doc = translate('London is calling')
console.log( doc.sentences().toNegative().out('text'))


/* */


const config = require('../config.js')


const survey = require('../../app/services/survey')
const surveyElements = survey.getElements()










let questionCount = 0

// console.log('config',config)
const smelly = 'https://agario-skins.org/images/skins/custom/smelly.png'
const stinkie = 'https://stinkie.one/static/media/logo.591c1b5d.jpg'

const bot = new TelegramBot(config.telegram.botkey, { polling: true })
/*bot.setWebHook('bot2.stinkie.one', {
  certificate: '../cert/cert.pem'
}).then( () => {
	bot.getWebHookInfo().then( whInfo => console.log( 'web hook info',whInfo ) )
}).error( err => {
	console.log('error setting webhook', err )
})
*/
bot.on('message', msg => {
	if (msg.text.toString().toLowerCase().indexOf("hi") === 0) {
		bot.sendMessage(msg.chat.id,"Hello dear user")
		bot.sendMessage(msg.from.id, "Hello  " + msg.from.first_name)
		bot.sendMessage(
			msg.chat.id,
			"<b>bold</b> \n <i>italic</i> \n <em>italic with em</em> \n <a href=\"https://stinkie.one/\">inline URL</a> \n <code>inline fixed-width code</code> \n <pre>pre-formatted fixed-width code block</pre>",
			{parse_mode : "HTML"}
		)
	} 
	if (msg.text.indexOf("I'm robot") === 0) {
    bot.sendMessage(msg.chat.id, "Yes I'm robot but not in that way!");
	} 
	if (msg.text.indexOf("location") === 0) {
    bot.sendLocation(msg.chat.id,44.97108, -104.27719)
    bot.sendMessage(msg.chat.id, "Here is the point")
  }     
})

bot.onText(/\/start/, msg => {

	bot.sendMessage( msg.chat.id, "Welcome", { 
		"reply_markup": {
    	"keyboard": [["Sample text", "Second sample"], ["Keyboard"], ["I'm robot"]]
   	}
	})
    
})

bot.onText(/\/tokens/, msg => {
	let msgtokens = tokens.reduce( (a,c) => `${a}[${c.name}] `, "" )
	bot.sendMessage( msg.chat.id, msgtokens )
})

bot.onText(/\/checkToken/, msg => {
	const tokenName = msg.text.substring(12)
	const tokenId = app.getTokenId( tokenName )
	console.log(`checking token ${tokenId}:${tokenName}`)
	if( tokenId === -1)
		bot.sendMessage( msg.chat.id, `no token ${tokenName} in our library`)
	else {
		const markets = tokens[tokenId].markets
		const current = markets[markets.length-1]
		let str = formatters.tokenMarket( current )
		bot.sendMessage( msg.chat.id, str, {parse_mode : "HTML"} )
	}



})

bot.onText(/\/restart/, msg => {

	bot.sendMessage( msg.chat.id, "Welcome", { 
		"reply_markup": {
    	"keyboard": [["Diff text", "Diff sample"], ["Keyboard"], ["I'm robot"]]
   	}
	})
    
})

bot.onText(/\/sendpic/, msg => {

	bot.sendPhoto( msg.chat.id, smelly, {caption : "Here we go ! \nThis is just a caption "})
    
})


bot.onText(/\/stinkie/, msg => {
	bot.sendPhoto( msg.chat.id, stinkie )
})

let isRKOpen = false 

const rk = new ReplyKeyboard()
const ik = new InlineKeyboard()

rk
	.addRow( "1", "2", "3", "4", "5" )
	//.addRow("2:1 button", "2:2 button");
 
ik
	.addRow(
		{ text: "1:1 button", callback_data: "1:1 Works!" },
		{ text: "1:2 button", callback_data: "1:2 Works!" }
	)
	.addRow(
		{ text: "2:1 button", callback_data: "2:1 Works!" },
		{ text: "2:2 button", callback_data: "2:2 Works!" }
	);


function hasBotCommands(entities) {
	if (!entities || !(entities instanceof Array)) {
		return false
	}
	return entities.some(e => e.type === "bot_command")
}

bot.onText(/\/nextQuestion/i, msg => {
	bot.sendMessage(msg.from.id, surveyElements[questionCount++].title, rk.open({resize_keyboard: true}))
	.then( () => {
		isRKOpen = !isRKOpen
	})
	if (questionCount == surveyElements.length) questionCount = 0
});

bot.onText(/\/forceReply/i, msg => {
	bot.sendMessage(msg.from.id, "Hey, this is a forced-reply. Reply me.", (new ForceReply()).export())
})

bot.onText(/\/inlineKeyboard/i, msg => {
	bot.sendMessage(msg.from.id, "This is a message with an inline keyboard.", ik.export())
})

bot.on("message", msg => {
	if (!hasBotCommands(msg.entities)) {
		if ( isRKOpen ) {
			console.log('reply msg',msg)
			bot.sendMessage(msg.from.id, "Good!", rk.close())
			isRKOpen = !isRKOpen
		}

		if (!!msg.reply_to_message) {
			bot.sendMessage(msg.from.id, "Good! ForceReply works!");
		}
	}
})

bot.on("callback_query", query => {
	bot.answerCallbackQuery(query.id, { text: "Action received!" })
	.then( () => {
		console.log('query on callback',query)
		bot.sendMessage(query.from.id, `Hey there! You clicked on an inline button! ${query.data} So, as you saw, the support library works!`);
	})
})

