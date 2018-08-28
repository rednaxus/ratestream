
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

const info = require('../app/services/API/newsinfo')


let appData = require('./app.json')
let infoData = require('./info.json')

var { tokens, users, analyst_questions, reviewer_questions, rounds, reviews, scripts } = appData

const categories = config.review_categories

var saveTimer

const round_window = 3600*8 // 8 hours
const round_window_min = 3600*2 // 2 hours, minimum window left for a second lead to be added


function* entries(obj) { // object iterator
	for (let key of Object.keys(obj)) 
		yield [key, obj[key]]
}

const fetchToken = address => new Promise( (resolve, reject) => {
	ethplorer.getTokenInfoExt(address).then( result => {
		//console.log('got result',result)
		resolve( result.data )
	}).catch( reject )
})

var nextTokenFetch = 0
var nextTokenInfoFetch = 0
var nextRoundToken = 0
var tokensToCover = []

var now = config.timebase //() => Math.round(+new Date() / 1000) // can fix time from here

const randomInt = max => Math.floor( Math.random() * Math.floor( max ) )
const randomIdx = length => randomInt( length - 1 )	// random int starting at 0 to e.g. length-1 
module.exports = {
	...info,
	data: appData,
	time: () => now,
	cron: forward_seconds => ( now += forward_seconds ),
	start: ( autosave = true, cb ) => {  // start app
		if (autosave) saveTimer = setInterval( ()=> {
			let changes = module.exports.roundsAssess()
			if (cb) cb( changes )
			module.exports.save()
		}, 600000 )
		tokens.forEach( (token,idx) => console.log( `[${idx}] ${token.name}` ) )
	},
	stop: () => {
		clearInterval(saveTimer)
	},
	save: () => {
		console.log('saving app')
		fs.writeFileSync('../app.json', JSON.stringify(appData,null,2), 'utf8')
	},

	saveInfo: () => {
		console.log('saving info')
		fs.writeFileSync('../info.json', JSON.stringify(infoData,null,2), 'utf8')
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

	roundReviewCategories: ( round, user ) => {
		let roundUser = round.users.find( (rounduser,idx) => ( idx < 2 && rounduser.user === user.id ) ) 
		if (!roundUser) {
			console.log('!!programmer error, reviewer user not found for round')
			return {}
		}
		let done = []
		let needed = []
		console.log('chedking cats now')
		categories.forEach( category => ( roundUser.sections[category] ? done.push(category): needed.push(category) ) )
		return ({ done, needed })
	},
	roundToLead: user => { // get a round to lead

		let time = now
		//let user = users[ userIdx ]
		// sanity check, don't call me if you already have active round
		if ( user.active_review_round !== -1 ) {
			console.log('programmer error!!! user already has active round')
			return
		}

		let roundIdx
		let role
		let roundCandidates = rounds.reduce( ( candidates, round, idx ) => { 
			if (!round.users[1].user && round.finish >= time + round_window_min) {
				candidates.push( idx )
			}
			return candidates
		}, [])
		console.log(`round candidates ${roundCandidates}`)
		if ( roundCandidates.length ) {
			roundIdx = roundCandidates[ randomIdx( roundCandidates.length ) ]
			console.log(`assigning to existing round ${roundIdx}`)
			let round = rounds[ roundIdx ]
			round.users[1] = { uid: user.id, start: time, finish:0, sections:{} }
		} else { // create round
			if (!tokensToCover.length) { // reset list of tokens to choose
				tokensToCover = tokens.map( (_,idx) => idx )
			}
			let tokenIdx = randomIdx( tokensToCover.length )
			let token = tokens[ tokenIdx ]
			tokensToCover = tokensToCover.slice(tokenIdx, tokenIdx)

			console.log(`creating round with token ${token.name}`)
			roundIdx = rounds.length
			rounds.push({
				id: roundIdx,
				token: tokenIdx,
				start: time,
				finish: time + round_window,
				status: 'active',
				users: [{ // first 2 are leads
				  uid: user.id, 
          start: time,
          finish: 0,
          sections:{}
         },{}]
			})

			//appData.rounds.active.push( roundIdx )
			console.log(`created round`,round)
		}

		user.active_review_round = roundIdx //{ review_state:null, round: roundIdx, media_state: null, role }
		module.exports.save()
		return roundIdx
	},
	roundToAnalyze: user => {
		// get least covered round

 		if (user.active_jury_round !== -1) {
 			console.log('already have active jury round')
 			return -1
		}

		let roundsActive = rounds.reduce( (actives, round, idx) => {
			if (round.status === 'active' && round.users[0].user !== userIdx && round.users[1].user !== user.id ) 
				actives.push(idx)
			return actives
		}, [] )
		if (!roundsActive.length ) {
			console.log('no valid rounds active')
			return -1
		}

		console.log('sorting',roundsActive)
		roundsActive = roundsActive.sort( (r1,r2) => ( rounds[ r1 ].users.length - rounds[ r2 ].users.length ) )
		console.log('rounds active',roundsActive)

		// add jurist to round
		let juryRound = roundsActive[ 0 ]
		rounds[juryRound].users.push( { user: user.id, start: now, finish: 0, question: 0 } )
		users[ userIdx ].active_jury_round = juryRound
		module.exports.save()
		return juryRound
	},
	roundsAssess: () => { // should run every 10 minutes or so
		// tally results
		//         
		/* from veva: get winner
        uint8 r0 = uint8(round.averages[ 0 ][ 0 ]);
        uint8 r1 = uint8(round.averages[ 1 ][ 0 ]);
        if ( r1 > r0 + 20) round.winner = 0;
        else if ( r1 < r0 - 20) round.winner = 1;
        else if ( r1 > 50 ) round.winner = 0;
        else round.winner = 1;
		*/
		// put analysts in proper pre or post stage

		// finalize expired rounds
		return { /* analysts_change_stage:[], analysts_round_expired:[]   */ }
	},
	roundRole: ( round, user ) => ( 
		round.users[0].user == user.id ? 'bull': 
		( round.users[1].user == user.id ? 'bear': 'analyst')
	),
	clearRounds: () => { // clear all rounds...beware!
		appData.rounds = []
		rounds = appData.rounds
		users.forEach( user => {
			console.log('clearing for user',user)
			user.active_jury_round = -1
			user.active_review_round = -1
		})
		module.exports.save()
	},


	/* tokens */
	getTokenId: name => ( appData.tokens.findIndex( token => token.name == name ) ),

	refreshTopTokens: () => {
		ethplorer.getTopTokens().then( tops => {
			//appData.tokens_top = tops
			let toptokens = tops.data.tokens
			//console.log('tops',toptokens )
			toptokens.forEach( toptoken => {
				let tokenFound = appData.tokens.findIndex( token => token.name === toptoken.name )
				if (tokenFound === -1) {
					appData.tokens.push( { address: toptoken.address, name: toptoken.name.trim(), markets: [] } )
					tokenFound = appData.tokens.length - 1
				}
				//appData.tokens[ tokenFound ].markets.push( { timestamp: now, ...toptoken } )
			})
			module.exports.save()
		}).catch( err => console.log(err) )
	},
	refreshTokens: () => {
		doFetch = () => {
			let token = appData.tokens[nextTokenFetch]
			if (!token.markets) token.markets = []
			//console.log('fetch token with address',token.address)
			fetchToken( token.address ).then( marketData =>{
				//console.log('got token data',marketData)
				token.markets.push( { timestamp: now(), ...marketData } )
				//console.log(appData.tokens)
				if (++nextTokenFetch === appData.tokens.length ) {
					console.log('finish fetching tokens')
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
		let user = { 
			id: appData.users.length,
			...refcode.getRefCodePair(),
			t_id: 					t_user.id, 
			first_name: 		t_user.first_name,
			last_name: 			t_user.last_name,
			username: 			t_user.username, 
			language_code: 	t_user.language_code, 
			active_jury_round:-1,
			active_review_round:-1
		}
		appData.users.push( user )
		module.exports.save()
		return user
	},

	/* news / info */
	refreshInfo: () => {
		doFetch = () => {
			let token = appData.tokens[nextTokenInfoFetch]
			//if (!infoData.tokens[token.name]) infoData.tokens[tokenName] = 
			console.log(`getting details for ${token.name}`)
			let tokenName = token.name.toLowerCase()
			module.exports.coinDetails( tokenName ).then( details => {
				console.log('got token details',details)
				if (!infoData.tokens[token.name]) infoData.tokens[token.name] = { timestamp: Math.round( moment.now() / 1000 ) }
				infoData.tokens[token.name].details = details
				//console.log(appData.tokens)
				module.exports.topNewsByCoin( tokenName ).then( news => {
					infoData.tokens[token.name].news = news
					// save any coins for staging if included in the article and not in the db
					news.forEach( anews => anews.coins.forEach( coin => {
						console.log('checking coverage for ',coin)
						let coinname = coin.name.toLowerCase()
						let tokenFound = appData.tokens.findIndex( token => token.name.toLowerCase() === coinname )
						if ( tokenFound === -1 && !appData.tokens_not_covered[coin.name] ) {
							//console.log('adding ',coin.name)
							appData.tokens_not_covered[coin.name] = { name: coin.name }
						}
					}))
					if (++nextTokenInfoFetch === appData.tokens.length ) {
						module.exports.saveInfo()
						module.exports.save()
						nextTokenInfoFetch = 0
					} else {
						doFetch()
					}					
				}).catch( err => {
					console.log('!!!!should not happen, error in getting news')
				})

			}).catch( err => { 
				console.log(`fail to get info`,err )
				if (++nextTokenInfoFetch === appData.tokens.length ) {
					module.exports.saveInfo()
					module.exports.save()
					nextTokenInfoFetch = 0
				} else {
					doFetch()
				}
			})
		}
		doFetch()

	}

}




