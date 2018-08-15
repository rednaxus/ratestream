//this is telegram

const TelegramBot = require('node-telegram-bot-api')
const { InlineKeyboard, ReplyKeyboard, ForceReply } = require('telegram-keyboard-wrapper')

const nlp = require('compromise')

/* nlp tests */
var t = nlp('dinosaur').nouns().toPlural()

console.log( t.out('text') )

var doc = nlp('London is calling')
console.log( doc.sentences().toNegative().out('text'))

/* */


const config = require('../config.js')

const roundsService = require('../../src/app/services/API/rounds')
const cyclesService = require('../../src/app/services/API/cycles')
const tokensService = require('../../src/app/services/API/tokens')

const tokenomics = require('../../src/app/services/tokenomics')
const statusService = require('../../src/app/services/analystStatus')

const utils = require('../../src/app/services/utils') // parseB32StringtoUintArray, toHexString, bytesToHex, hexToBytes




const ethplorer = require('../../src/app/services/API/ethplorer.js')

const survey = require('../../src/app/services/survey')
const surveyElements = survey.getElements()


const standardTokens = [
  { address: '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0', name: 'EOS'              		},
  { address: '0xf230b790e05390fc8295f4d3f60332c93bed42e2', name: 'Tronix'           		},
  { address: '0xd850942ef8811f2a866692a623011bde52a462c1', name: 'VeChain Token'     		},
  { address: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07', name: 'OMGToken'             },
  { address: '0xb5a5f22694352c15b00323844ad545abb2b11028', name: 'ICON'           			},
  { address: '0xb8c77482e45f1f44de1745f52c74426c631bdd52', name: 'BNB' 									},
  { address: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a', name: 'Digix'         				},
  { address: '0xd4fa1460f537bb9085d22c7bccb5dd450ef28e3a', name: 'Populous Platform'    },
  { address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', name: 'Maker'     						},
  { address: '0x744d70fdbe2ba4cf95131626614a1763df805b9e', name: 'Status Network'      	},
  { address: '0x168296bb09e24a88805cb9c33356536b980d3fc5', name: 'RHOC'      						},
  { address: '0xe94327d07fc17907b4db788e5adf2ed424addff6', name: 'Reputation'         	},
  { address: '0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d', name: 'Aeternity'          	},
  { address: '0xcb97e65f07da24d46bcdd078ebebd7c6e6e3d750', name: 'Bytom'              	},
  { address: '0xb7cb1c96db6b22b0d3d9536e0108d062bd488f74', name: 'Walton Token'         },
  { address: '0x4ceda7906a5ed2179785cd3a40a69ee8bc99c466', name: 'AION'          				}
]



const getToken = name => new Promise( (resolve, reject) => {
	let tokenIndex = standardTokens.findIndex( token => token.name == name )
	if ( tokenIndex == -1 ) return reject('no token of that name')

	ethplorer.getTokenInfoExt(standardTokens[tokenIndex].address).then( result => {
		console.log('got result',result)
		resolve( result.data )
	}).catch( reject )

})






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
	let tokens = standardTokens.reduce( (a,c) => `${a}[${c.name}] `, "" )
	bot.sendMessage( msg.chat.id, tokens )
})

bot.onText(/\/checkToken/, msg => {
	const tokenName = msg.text.substring(12)
	console.log(`checking token of name ${tokenName}`)
	getToken( tokenName ).then( token => {
		bot.sendMessage( msg.chat.id, JSON.stringify(token) )
	}).catch( err => {
		bot.sendMessage( msg.chat.id, `no token ${tokenName} in our library`)

	})


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

