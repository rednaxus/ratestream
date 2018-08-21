//this is telegram

const TelegramBot = require('node-telegram-bot-api')
const { InlineKeyboard, ReplyKeyboard, ForceReply } = require('telegram-keyboard-wrapper')

const { translate } = require('../nlp')

var app = require('../application')
const formatters = require('./formatters')

var { tokens, users, rounds, questions, reviews, scripts } = app.data

app.start(false) // no autosave for development
app.save() // reformat any json changes



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

var leadNum = 0 // for now, need to be better about token choices
var role = 0 // bull/bear, 0->1
bot.on('message', msg => {
	let msgText = msg.text.toString().toLowerCase()
	let userIdx = app.userByTelegram( msg.from )
	//console.log('msg in essage',msg)
	switch (msgText) {
		case 'news':
			app.topNewsByCoin('monero').then( articles => console.log(articles) )
		case 'command':
			bot.sendMessage(msg.chat.id,'commands....')
			break
		default:
			console.log(`unknown msg ${msg.text}`)
	
	}
	
})



	/*
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
  */    

/* app */
bot.onText(/\/restart/, msg => {

	bot.sendMessage( msg.chat.id, "Welcome", { 
		"reply_markup": {
    	"keyboard": [["Diff text", "Diff sample"], ["Keyboard"], ["I'm robot"]]
   	}
	})
    
})

bot.onText(/\/start/, msg => {
	console.log('start',msg)
	let idx = app.userByTelegram( msg.from )
	let user = users[idx]
	//console.log(`got user ${userIdx}`,user)
	bot.sendMessage( msg.chat.id, `Welcome ${user.first_name}`, { 
		"reply_markup": {
    	"keyboard": [["Sample text", "Second sample"], ["Keyboard"], ["I'm robot"]]
   	}
	})
    
})

/* rounds */
bot.onText(/\/leadRound/i, msg => {
	let userIdx = app.userByTelegram( msg.from )
	console.log(`getting round for user ${userIdx}`)
	let roundIdx = app.roundToLead( userIdx )
	let round = rounds.all[ roundIdx ]
	let token = tokens[ round.token ]
	let role = app.roundRole(round, userIdx)
	console.log(`round ${roundIdx}`)
	bot.sendMessage(msg.chat.id,`you are ${role} lead, for token ${token.name}`)
})

bot.onText(/\/analyze/i, msg => { // jurist start round

})


bot.onText(/\/next/i, msg => {
	
	bot.sendMessage(msg.from.id, surveyElements[questionCount++].title, rk.open({resize_keyboard: true}))
	.then( () => {
		isRKOpen = !isRKOpen
	})
	if (questionCount == surveyElements.length) questionCount = 0
})


/* tokens */
bot.onText(/\/tokens/i, msg => {
	let obj = formatters.tokens( tokens )
	bot.sendMessage( msg.chat.id, "Covered Tokens", obj )
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

/* internal use */
bot.onText(/\/refreshTokens/, msg => {
	console.log('refresh tokens')
	app.refreshTokens() // can do this on regular interval
	bot.sendMessage( msg.chat.id, `refreshing token data`)
})
bot.onText(/\/refreshInfo/, msg => {
	app.refreshInfo()
	bot.sendMessage( msg.chat.id, `refreshing news information`)
})
bot.onText(/\/refreshTopTokens/, msg => {
	app.refreshTopTokens() // can do this on regular interval
	bot.sendMessage( msg.chat.id, `refreshing top tokens`)
})


/* questions */

bot.onText(/\/questions/i, msg => {
	let str = ''
	str = questions.reduce( (str, question, num) => ( `${str}${num+1}. ${question.text}\n` ), "")
	bot.sendMessage(msg.chat.id, str)
})


/* query callbacks */
bot.on("callback_query", query => {
	let userIdx = app.userByTelegram( query.from )
	let user = users[userIdx]
	bot.answerCallbackQuery(query.id, { text: `Action received from ${user.first_name}!` })
	.then( () => {
		console.log('query on callback',query)
		let q = query.data.split('-')
		switch (q[0]) {
			case 'token': 
				const tokenId = +q[1]
				const markets = tokens[tokenId].markets
				const current = markets[markets.length-1]
				bot.sendMessage( query.message.chat.id, formatters.tokenMarket( current ), {parse_mode : "HTML"} )
				break
			default:
				console.log(`unrecognized command ${q[0]}`)
		}
		//bot.sendMessage(query.from.id, `Hey there! You clicked on an inline button! ${query.data}`)

	})
})


/* misc examples / dumping ground */
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
		{ text: "1:2 button", callback_data: "1:2 Works!" },
		{ text: "1:1 button", callback_data: "1:1 Works!" },
		{ text: "1:2 button", callback_data: "1:2 Works!" }
	)
	.addRow(
		{ text: "2:1 button", callback_data: "2:1 Works!" },
		{ text: "2:2 button", callback_data: "2:2 Works!" },
		{ text: "1:1 button", callback_data: "1:1 Works!" },
		{ text: "1:2 button", callback_data: "1:2 Works!" }
	);
//console.log('ik export',JSON.stringify(ik.export()))

function hasBotCommands(entities) {
	if (!entities || !(entities instanceof Array)) {
		return false
	}
	return entities.some(e => e.type === "bot_command")
}
/*
const ikexport = {
	"reply_markup":{
		"inline_keyboard":[
			[
				{
					"text":"1:1 button","callback_data":"1:1 Works!"
				},
				{"text":"1:2 button","callback_data":"1:2 Works!"},
				{"text":"1:1 button","callback_data":"1:1 Works!"},
				{"text":"1:2 button","callback_data":"1:2 Works!"}
			],
			[
				{"text":"2:1 button","callback_data":"2:1 Works!"},
				{"text":"2:2 button","callback_data":"2:2 Works!"},
				{"text":"1:1 button","callback_data":"1:1 Works!"},
				{"text":"1:2 button","callback_data":"1:2 Works!"}
			]
		]
	}
}
*/
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



