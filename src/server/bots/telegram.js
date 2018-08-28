//this is telegram

const TelegramBot = require('node-telegram-bot-api')
const { InlineKeyboard, ReplyKeyboard, ForceReply } = require('telegram-keyboard-wrapper')

const { translate } = require('../nlp')
const moment = require('moment')

var app = require('../application')
const { dialogs } = app

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

const botReply = (chat_id,reply) => {
	//console.log('bot reply',chat_id,reply)
	let ret
	let parse
	if (reply.parse) parse = {...reply.parse} // oops, bug in bot, modifies parse 
	if (reply.parse && reply.format)
		ret = bot.sendMessage(chat_id,reply.text,reply.format,parse)
	else if (reply.parse || reply.format)
		ret = bot.sendMessage(chat_id,reply.text,reply.format || parse)
	else
		ret = bot.sendMessage(chat_id,reply.text)
	return ret
}

var leadNum = 0 // for now, need to be better about token choices
var role = 0 // bull/bear, 0->1
bot.on('message', msg => {
	let user = app.userByTelegram( msg.from )
	if (user.receive) {
		console.log('user receive',user)
		let q = user.receive.split('-')
		if (q[0] == 'review'){
			if (q[1] == 'category') {
				let catIdx = +q[2]
				botReply(msg.chat.id, app.cmd('review_category',{ user, category:catIdx, text:msg.text.toString() }) ).then( () => {
					//botReply( msg.chat.id, app.cmd( 'review_categories', {user} ) )
				})
			}
		}
		user.receive = null // clear it	
	}
	else { // not sure about this yet
		let msgText = msg.text.toString().toLowerCase()
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
				//console.log(`unknown msg ${msg.text}`)
		
		}
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
	botReply( msg.chat.id, app.cmd('restart',{user:app.userByTelegram( msg.from )} ) )
})

bot.onText(/\/start/, msg => {
	botReply( msg.chat.id, app.cmd('start', {user: app.userByTelegram( msg.from )}) )    
})

/* rounds */
bot.onText(/\/review/i, msg => {
	//let msgInfo = msg.text.split(' ') // for testing, so can explicitly specify user
	let user = app.userByTelegram( msg.from )
	botReply( msg.chat.id, app.cmd( 'review', {user} ) ).then( () => {
		botReply( msg.chat.id, app.cmd( 'review_categories', {user} ) )
	})
})

bot.onText(/\/analyze/i, msg => { // jurist start round
	let user = app.userByTelegram( msg.from )
	if (user.active_jury_round !== -1) {
		let round = rounds[ user.active_jury_round ]
		let token = tokens[ round.token ]
		let roundUser = round.users.find( roundUser => roundUser.user == user.id )
		bot.sendMessage(msg.chat.id,`you are already analyst in round with token ${token.name}`)
		bot.sendMessage(msg.chat.id,`next question: ${ analyst_questions[roundUser.question].text }`)
		return
	}
	let round = app.roundToAnalyze( user )
	if (!round) {
		bot.sendMessage(msg.chat.id,dialogs['analysis.none'].text())
	} else {
		bot.sendMessage(msg.chat.id,dialogs['analysis.active'].text( { round, user }))
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
	botReply( msg.chat.id, app.cmd('tokens') )
})

bot.onText(/\/token /i, msg => {
	botReply( msg.chat.id, app.cmd('token', {name:msg.text.substring(12)}) )
})

/* internal use, admin only */

bot.onText(/\/clearRounds/i,msg => { // beware, clears all rounds, really
	botReply(msg.chat.id, app.cmd('roundsClear'))
})
bot.onText(/\/refreshTokens/, msg => {
	botReply( msg.chat.id, app.cmd('tokensRefresh') )
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
	botReply( msg.chat.id, app.cmd('time') )
})
bot.onText(/\/cron/, msg => { // specified in hours if want to specify
	const fields = msg.text.split(' ')
	console.log('fields',fields)
	const delta = fields.length == 1 ? 3600 : +fields[1] * 3600
	//console.log('delta is',delta)
	let reply = app.cmd('cron',{delta:delta})
	bot.sendMessage( msg.chat.id, reply.text )
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
	botReply(msg.chat.id, app.cmd('questions') )
})

/* query callbacks */
bot.on("callback_query", query => {
	let user =  app.userByTelegram( query.from )
	bot.answerCallbackQuery(query.id, { text: `Action received from ${user.first_name}!` })
	.then( () => {
		console.log('query on callback',query)
		let q = query.data.split('-')
		switch (q[0]) {
			case 'token': 
				botReply( query.message.chat.id, app.cmd('token', {id:+q[1]} ) )
				break
			case 'review':
				if (q[1] && q[1] == 'category') {
					botReply(query.message.chat.id, app.cmd('review_category_request',{ user, category: +q[2]}) )
					console.log('submit category')
				}
			default:
				console.log(`unrecognized command ${q[0]}`)
		}
		//bot.sendMessage(query.from.id, `Hey there! You clicked on an inline button! ${query.data}`)

	})
})


/* misc examples / dumping ground */
/*
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
*/
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
/*
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
*/



