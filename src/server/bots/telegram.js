//this is telegram

const TelegramBot = require('node-telegram-bot-api')
const { InlineKeyboard, ReplyKeyboard, ForceReply } = require('telegram-keyboard-wrapper')

const { translate } = require('../nlp')
const moment = require('moment')

var app = require('../application')
const formatters = require('./formatters')

var { tokens, users, rounds, analyst_questions, reviewer_questions, reviews, scripts } = app.data

app.start(false) // no autosave for development
app.save() // reformat any json changes

var testUsers = users.filter( user => user.first_name.startsWith('tester_'))
console.log('users:',users)
console.log('testusers:',testUsers)

/* nlp tests */
var t = translate('dinosaur').nouns().toPlural()

console.log( t.out('text') )

var doc = translate('London is calling')
console.log( doc.sentences().toNegative().out('text'))


/* */


const config = require('../config.js')


//const survey = require('../../app/services/survey')
//const surveyElements = survey.getElements()


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
		case 'commands':
			bot.sendMessage(msg.chat.id,'commands....')
			break
		case 'tokens':
			bot.sendMessage( msg.chat.id, "Covered Tokens", formatters.tokens( tokens ) )
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
	bot.sendMessage( msg.chat.id, `Welcome ${user.first_name}`, formatters.menu() ) 
    
})

/* rounds */
bot.onText(/\/review/i, msg => {
	
	let msgInfo = msg.text.split(' ') // for testing, so can explicitly specify user

	let userIdx = app.userByTelegram( msg.from )
	let user = users[ userIdx ]
	let roundIdx
	let round
	let role
	let token
	if ( user.active_review_round !== -1 ) {
		//console.log('already review busy')
		round = rounds[ user.active_review_round ]
		//console.log('with round',round)
		bot.sendMessage(msg.chat.id,`you are already ${app.roundRole(round, userIdx)} reviewer for ${tokens[round.token].name}`)
		return
	}
	//console.log(`finding review round for user ${userIdx}`)
	roundIdx = app.roundToLead( userIdx )
	round = rounds[ roundIdx ]
	role = app.roundRole(round, userIdx)

	bot.sendMessage(msg.chat.id,`you are ${role} reviewer, for token ${tokens[round.token].name}`)
	bot.sendMessage(msg.chat.id,`let's get started!`)
})

bot.onText(/\/analyze/i, msg => { // jurist start round
	let userIdx = app.userByTelegram( msg.from )
	let user = users[ userIdx ]
	if (user.active_jury_round !== -1) {
		let round = rounds[ user.active_jury_round ]
		let token = tokens[ round.token ]
		let roundUser = round.users.find( roundUser => roundUser.user == userIdx )
		bot.sendMessage(msg.chat.id,`you are already analyst in round with token ${token.name}`)
		bot.sendMessage(msg.chat.id,`next question: ${ analyst_questions[roundUser.question].text }`)
		return
	}
	let roundIdx = app.roundToAnalyze( userIdx )
	if (roundIdx == -1) {
		bot.sendMessage(msg.chat.id,`Sorry...no rounds to analyze right now`)
	} else {
		let round = rounds[ roundIdx ]
		bot.sendMessage(msg.chat.id,`now active in round with token ${tokens[round.token].name}`)
	}
})


bot.onText(/\/next/i, msg => {
	
	bot.sendMessage(msg.from.id, analyst_questions[questionCount++].text, rk.open({resize_keyboard: true}))
	.then( () => {
		isRKOpen = !isRKOpen
	})
	if (questionCount == analyst_questions.length) questionCount = 0
})


/* tokens */
bot.onText(/\/tokens/i, msg => {
	let obj = formatters.tokens( tokens )
	bot.sendMessage( msg.chat.id, "Covered Tokens", obj )
})

bot.onText(/\/token/i, msg => {
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

/* internal use, admin only */

bot.onText(/\/clearRounds/i,msg => { // beware, clears all rounds, really
	app.clearRounds()
	bot.sendMessage(msg.chat.id,`rounds cleared`)
})
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
bot.onText(/\/time/, msg => {
	bot.sendMessage( msg.chat.id, formatters.apptime( app.time() ) )
})
bot.onText(/\/cron/, msg => { // specified in hours if want to specify
	const fields = msg.text.split(' ')
	console.log('fields',fields)
	const delta = fields.length == 1 ? 3600 : +fields[1] * 3600
	//console.log('delta is',delta)
	app.cron( delta )
	bot.sendMessage( msg.chat.id, formatters.apptime( app.time() ) )
})
bot.onText(/\/testAddReviewers/, msg => {	
	testUsers.forEach( (user,idx) => {
		let userIdx = app.userByTelegram( { id: user.t_id } )
		roundIdx = app.roundToLead( userIdx )
		if (roundIdx === -1) {
			console.log(`failed to add ${userIdx}`)
			return
		}
		round = rounds[ roundIdx ]
		role = app.roundRole(round, userIdx)
		//console.log(`${userIdx} added to round ${roundIdx}`)
		bot.sendMessage(msg.chat.id,`${users[ userIdx ].first_name} now reviewing for round ${roundIdx} with token ${tokens[round.token].name}`)

	})
})
bot.onText(/\/testAddAnalysts/, msg => {
	testUsers.forEach( (user,idx) => {
		let userIdx = app.userByTelegram( { id: user.t_id } )
		let roundIdx = app.roundToAnalyze( userIdx )
		if (roundIdx == -1) {
			bot.sendMessage(msg.chat.id,`Sorry...no rounds to analyze right now`)
		} else {
			let round = rounds[ roundIdx ]
			bot.sendMessage(msg.chat.id,`${users[ userIdx ].first_name} now analyzing in round ${roundIdx} with token ${tokens[round.token].name}`)
		}	
	})
})
/* questions */

bot.onText(/\/questions/i, msg => {
	bot.sendMessage(msg.chat.id, formatters.analyst_questions())
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



