
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

var saveTimer

const round_window = 3600*8 // 8 hours
const round_window_min = 3600*2 // 2 hours, minimum window left for a second lead to be added

const fetchToken = address => new Promise( (resolve, reject) => {
	ethplorer.getTokenInfoExt(address).then( result => {
		//console.log('got result',result)
		resolve( result.data )
	}).catch( reject )
})

var nextTokenFetch = 0
var nextTokenInfoFetch = 0
var nextRoundToken = 0


const now = () => Math.round(+new Date() / 1000)
const randomInt = max => Math.floor( Math.random() * Math.floor( max ) )
const randomIdx = length => randomInt( length - 1 )	// random int starting at 0 to e.g. length-1 
module.exports = {
	...info,
	data: appData,
	start: ( autosave = true ) => {  // start app
		if (autosave) saveTimer = setInterval( ()=> {
			module.exports.roundsExpire()
			module.exports.save()
		}, 600000 )
		appData.tokens.forEach( (token,idx) => console.log( `[${idx}] ${token.name}` ) )
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
	roundToLead: userIdx => { // get a round to lead

		let time = now()
		let user = appData.users[ userIdx ]
		// sanity check, don't call me if you already have active round
		if ( user.active_review_round ) {
			console.log('programmer error!!! user already has active round')
		}

		let rounds = appData.rounds.all
		let roundIdx
		let role
		let roundCandidates = rounds.reduce( ( candidates, round, idx ) => { 
			if (round.leads.length < 2 && round.finish >= time + round_window_min) {
				candidates.push( idx )
			}
			return candidates
		}, [])
		console.log(`round candidates ${roundCandidates}`)
		if ( roundCandidates.length ) {
			roundIdx = roundCandidates[ randomIdx( roundCandidates.length ) ]
			console.log(`assigning to existing round ${roundIdx}`)
			let round = appData.rounds.all[ roundIdx ]
			round.leads.push( { user: userIdx, start: time, finish:0, sections:[] })
			role = round.leads.length - 1
		} else { // create round
			if (!appData.rounds.tokens_to_cover.length) { // reset list of tokens to choose
				appData.rounds.tokens_to_cover = appData.tokens.map( (_,idx) => idx )
			}
			let tokenIdx = randomIdx( appData.rounds.tokens_to_cover.length )
			let token = appData.tokens[ tokenIdx ]
			appData.rounds.tokens_to_cover = appData.rounds.tokens_to_cover.slice(tokenIdx, tokenIdx)

			console.log(`creating round with token ${token.name}`)
			appData.rounds.all.push({
				token: tokenIdx,
				start: time,
				finish: time + round_window,
				leads:[{
				  user:userIdx, 
          start: time,
          finish: 0,
          sections:[]
         }],
				jurists:[]
			})
			role = 0
			roundIdx = appData.rounds.all.length - 1
			appData.rounds.active.push( roundIdx )
			console.log(`created round ${roundIdx}`)
		}

		user.active_review_round = { review_state:null, round: roundIdx, media_state: null, role }
		module.exports.save()
		return roundIdx
	},
	roundToAnalyze: userIdx => {
		// get least covered round
		let user = appData.users[ userIdx ]
		if (!appData.rounds.active.length || user.activeJuryRound ) return -1
		let activeRounds = appData.rounds.active.sort( (r1,r2) => ( appData.rounds.all[ r1 ].jurists.length - appData.rounds.all[ r2 ].jurists.length ) )

		// add jurist to round
		let juryRound = activeRounds[ 0 ]
		round = appData.rounds.all[ juryRound ]
		round.jurists.push( { user: userIdx, start: now(), finish: 0 } )
		appData.users[ userIdx ].active_jury_round = { round: juryRound, question: -1 }
		return juryRound
	},
	roundsExpire: () => { // finalize any expired rounds

	},
	roundRole: ( round, userIdx ) => ( round.leads[0].user == userIdx ? 'bull':'bear'),


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
				//appData.tokens[ tokenFound ].markets.push( { timestamp: now(), ...toptoken } )
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
		appData.users.push( { 
			...refcode.getRefCodePair(),
			t_id: 					t_user.id, 
			first_name: 		t_user.first_name,
			last_name: 			t_user.last_name,
			username: 			t_user.username, 
			language_code: 	t_user.language_code, 
			active_jury_round:null,
			active_review_round:null
		})
		module.exports.save()
		return appData.users.length-1
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




