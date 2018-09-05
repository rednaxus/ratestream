
const moment = require('moment')

const { InlineKeyboard, ReplyKeyboard, ForceReply } = require('telegram-keyboard-wrapper')


const config = require('../../app/config/appConfig')

function* entries(obj) { // object iterator
	for (let key of Object.keys(obj)) 
		yield [key, obj[key]]
}


module.exports = {

	commands: cmds => {
		
	},
	menu: () => ({ 
		"reply_markup": {
			"resize_keyboard": true,
    	"keyboard": [
    		[ "tokens", "commands", "news", "activity" ],
    		[ "rate", "review" ]
    	]
   	}
	}),
	analyst_question: ( question, question_number ) => {
		let ik = []
		let row = []
		if (question.max == 2) { // yes/no
			row.push( { text: 'yes', callback_data: `question-${question_number}-yes` } )
			row.push( { text: 'no', callback_data: `question-${question_number}-no` } )
		} else for (let idx = 1; idx <= question.max; idx++ ) {
 			row.push( { text: idx, callback_data: `question-${question_number}-${idx}` })
		}
		ik.push( row )
		console.log('ik',JSON.stringify(ik))
   	return { reply_markup:{ inline_keyboard: ik } }
	},
	analyst_questions: ( questions ) => (
		questions.reduce( (str, question, num) => ( `${str}${num+1}. ${question.text}\n` ), "")
	),
	reviewer_categories: ( categories ) => {
		let ik = []
		let row = []
		categories.forEach( (category,idx) => {
			let catIdx = config.review_categories.findIndex( allcategory => allcategory == category )
			let col = { text: category, callback_data: `review-category-${catIdx}` }
			if (idx % 3 != 0) { // add column
				row.push( col )
			} else { // new row
				if (row.length) ik.push( row )
				row = [ col ]
			}
		})
		ik.push( row )
		return { reply_markup:{ inline_keyboard: ik } }		
	},
	rounds: rounds => {

	},
	apptime: seconds => ( 
		`app time is [${seconds}] ${moment(seconds*1000).format('DD-MMMM-YYYY HH:MM:SS')}`
	),
	token: ( token, id ) => {
		let ik = [[ 
			{ text: 'info detail', callback_data: `token-details-${id}`},
			{ text: 'rating detail', callback_data: `token-something`}
		]]
		return { reply_markup:{ inline_keyboard: ik } }		
	},
	tokens: tokens => {
		//	let msgtokens = tokens.reduce( (str,token) => `${str}[${token.name}] `, "" )
		let ik = []
		let row = []
		tokens.forEach( (token,idx) => {
			let col = { text: token.name, callback_data: `token-${idx}` }
			if (idx % 3 != 0) { // add column
				row.push( col )
			} else { // new row
				if (row.length) ik.push( row )
				row = [ col ]
			}
		})
		ik.push( row )
		return { reply_markup:{ inline_keyboard: ik } }
	
/*
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
	},
	tokenMarket: market => {
		/*
		{
			"timestamp":1534704803,
			"address":"0xf230b790e05390fc8295f4d3f60332c93bed42e2",
			"name":"Tronix",
			"decimals":"6",
			"symbol":"TRX",
			"totalSupply":"100000000000000000",
			"owner":"0x",
			"transfersCount":2812176,
			"lastUpdated":1534704049,
			"issuancesCount":0,
			"holdersCount":1086597,
			"ethTransfersCount":13,
			"price":{
				"rate":"0.0217371068",
				"diff":3.32,
				"diff7d":-4.38,
				"ts":"1534703280",
				"marketCapUsd":"1429173727.0",
				"availableSupply":"65748111645.0",
				"volume24h":"96649929.5064",
				"diff30d":-40.690993326167,
				"currency":"USD"
			},
			"countOps":2812176
		}
		*/
		var str = ''
		for ( let [key, value] of entries(market) ) {
   		if ( key === 'price' ) { 
   			if (value) {
   				str += '---------\n'
	   			for ( let [pkey, pvalue] of entries(value) ) { // value can be 'false' / no price data
	   				switch (pkey) {
	   					case 'ts': 
	   						str += ''
	   						break
	   					default: 
	   						str += `<i>${pkey}</i> <b>${pvalue}</b>\n`
	   				}
	   			}
	   			str += '---------\n'
   			}
   		} else {
				switch (key) {
					case 'address': 
						str += `<i>${key}</i> <a href="https://etherscan.io/address/${value}">${value}</a>\n`
   					break
   				default:
   					str += `<i>${key}</i> <b>${value}</b>\n`
   				}
   			}
			}
		//console.log(str)
		return str
	}

}