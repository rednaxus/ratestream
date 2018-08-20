
const fs = require('fs')
const moment = require('moment')


const config = require('../app/config/appConfig')

const roundsService = require('../app/services/API/rounds')
const cyclesService = require('../app/services/API/cycles')
const tokensService = require('../app/services/API/tokens')

const tokenomics = require('../app/services/tokenomics')
const statusService = require('../app/services/analystStatus')

const utils = require('../app/services/utils') // parseB32StringtoUintArray, toHexString, bytesToHex, hexToBytes

const refcode = require('../app/services/referralCode')


const ethplorer = require('../app/services/API/ethplorer.js')



const survey = require('../app/services/survey')


let appData = require('./app.json')

var saveTimer

const active_round_window = 3600*8 // 8 hours

const fetchToken = address => new Promise( (resolve, reject) => {
	ethplorer.getTokenInfoExt(address).then( result => {
		//console.log('got result',result)
		resolve( result.data )
	}).catch( reject )
})

var nextTokenFetch = 0
var nextRoundToken = 0

const now = () => Math.round(+new Date() / 1000)
module.exports = {
	data: appData,

	start: () => {  // start app
		saveTimer = setInterval( ()=> {
			module.exports.save()
		}, 600000 ) 
		// save me timer here

		//module.exports.translateSurvey()

	},
	stop: () => {
		clearInterval(saveTimer)
	},
	save: () => {
		fs.writeFileSync('../app.json', JSON.stringify(appData,null,2), 'utf8')
	},


	/*
	translateSurvey: () => {
		let questions = survey.getElements()
		//console.log(questions)
		appData.questions = questions.map( question => { 
			return { 
				name: question.name, 
				category: "",
				max: 5,
				min: 1,
				title: question.name,
				text: question.title 
			}
		})
		console.log('aapdata',appData)
		module.exports.save()
	},
	*/

	/* rounds */
	roundToLead: userIdx => {
		let time = now()
		let user = appData.users[ userIdx ]
		let roundIdx = appData.rounds.findIndex( round => {
			return ( round.leads.length < 2 && round.finish_time > time )	// fix this...
		})
		if (roundIdx === -1) { // create round 
			console.log('creating round')
			appData.rounds.push({
				token: nextRoundToken,
				start_time: time,
				finish_time: time + active_round_window,
				leads:[ userIdx ],
				jurists:[]
			})
			if (++nextRoundToken === appData.tokens.length) nextRoundToken = 0
			roundIdx = appData.rounds.length - 1
			console.log(`created round ${roundIdx}`)
		} else { // assign to round
			console.log('assigning round')
			let round = appData.rounds[roundIdx]
			round.leads.push(userIdx)
		}
		user.active_review_rounds.push( roundIdx )
		module.exports.save()
		return roundIdx
	},
	roundRole: ( round, userIdx ) => (
		round.leads[0] == userIdx ? 'bull':'bear'
	),
	/* tokens */
	getTokenId: name => ( appData.tokens.findIndex( token => token.name == name ) ),

	refreshTokens: () => {
		doFetch = () => {
			let token = appData.tokens[nextTokenFetch]
			if (!token.markets) token.markets = []
			fetchToken( token.address ).then( marketData =>{
				console.log('got token data',marketData)
				token.markets.push( { timestamp: Math.round( moment.now() / 1000 ), ...marketData } )
				//console.log(appData.tokens)
				if (++nextTokenFetch === appData.tokens.length ) {
					module.exports.save()
					nextTokenFetch = 0
				} else {
					doFetch()
				}
			})
		}
		doFetch()

	},
	stopTokens: () => {

	},
	/* users */
	userByTelegram: t_user => {
		let idx = appData.users.findIndex( user => user.t_id === t_user.id )

		if (idx !== -1) return idx

		// first time in, create user
		appData.users.push( { 
			...refcode.getRefCodePair(),
			t_id: 					t_user.id, 
			first_name: 		t_user.first_name,
			last_name: 			t_user.last_name,
			username: 			t_user.username, 
			language_code: 	t_user.language_code, 
			active_jury_rounds:[],
			active_review_rounds:[]
		})
		module.exports.save()
		return appData.users.length-1
	}
}




