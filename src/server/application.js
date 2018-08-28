
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


const ethplorer = require('../app/services/API/ethplorer')



//const survey = require('../app/services/survey')

const info = require('../app/services/API/newsinfo')


let appData = require('./app.json')
let infoData = require('./info.json')
let scripts = require('./scripts.json')

var { tokens, users, analyst_questions, reviewer_questions, rounds, reviews } = appData


//const dialogs = require('./dialogs')
const formatters = require('./bots/formatters')


const categories = config.review_categories

var saveTimer

const round_window = 3600*8 // 8 hours
const round_window_min = 3600*2 // 2 hours, minimum window left for a second lead to be added
const parseHtml = {parse_mode:'HTML'} 

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

const app = {
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
		users.forEach( user => user.receive = null ) // clear out previous state
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
		let roundUser = round.users.find( (rounduser,idx) => ( idx < 2 && rounduser.uid === user.id ) ) 
		if (!roundUser) {
			console.log('!!programmer error, reviewer user not found for round')
			return {}
		}
		let done = []
		let needed = []
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

		console.log('round to lead')

		let roundIdx
		let round
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
			round = rounds[ roundIdx ]
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
			round = {
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
			}
			rounds.push( round )

			//appData.rounds.active.push( roundIdx )
			console.log(`created round`,round)
		}

		user.active_review_round = round.id //{ review_state:null, round: roundIdx, media_state: null, role }
		app.save()
		return round
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
		app.save()
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
	roundRole: ( round, user ) => {
		console.log('round role',round,user)
		return ( 
		round.users[0].uid == user.id ? 'bull': 
		( round.users[1].uid == user.id ? 'bear': 'analyst')
	)},
	clearRounds: () => { // clear all rounds...beware!
		appData.rounds = []
		rounds = appData.rounds
		users.forEach( user => {
			console.log('clearing for user',user)
			user.active_jury_round = -1
			user.active_review_round = -1
		})
		app.save()
	},


	/* tokens */
	getTokenId: name => ( appData.tokens.findIndex( token => token.name == name ) ),

	refreshTopTokens: () => {
		var self = this
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
			self.save()
		}).catch( err => console.log(err) )
	},
	refreshTokens: () => {
		var self = this
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
					self.save()
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

		if (idx !== -1) return appData.users[idx]

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
		app.save()
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

	},

	cmd: (command, data) => { // command processor for the app
		var retval
		let round
		let user
		let catName
		//var ret = (text,format) => ({ text:text, format:format })
		console.log(`command is ${command}`,data)
		switch (command) {
			case 'cron':
				app.cron( data.delta )
				retval = { text: formatters.apptime( app.time() ) }
				break
			case 'time':
				retval = { text: formatters.apptime( app.time() ) }
				break
			case 'roundsClear':
				app.clearRounds()
				retval = { text: dialogs['rounds.clear'].text() }
				break
			case 'questions':
				retval = { text: formatters.analyst_questions() }
				break
			case 'start':
				//console.log(`got user ${idx}`,user)
				retval = { text: dialogs['welcome.new'].text({user:data.user}), format: formatters.menu() }
				break
			case 'restart':
				retval = { text: dialogs['welcome.returning'].text({user: data.user}), format: formatters.menu() }
				break
			case 'tokens':
				retval = { text:dialogs['tokens'].text(), format:formatters.tokens( tokens ) }
				console.log('retval',retval)
				break
			case 'tokensRefresh':
				app.refreshTokens() // can do this on regular interval
				break
			case 'token':
				let tokenId = Number.isInteger(data.id) ? data.id : app.getTokenId( data.name )
				console.log(`checking token ${tokenId}`)
				if( tokenId === -1)
					retval = { text:dialogs['token.notfound'].text( {tokenName:data.name} ) } 
				else {
					let markets = tokens[tokenId].markets
					let current = markets[markets.length-1]
					retval = { text: formatters.tokenMarket( current ), parse: parseHtml }
				}
				break
			case 'review':
				user = data.user
				console.log('fuck 1',parseHtml)
				if ( user.active_review_round !== -1 ) {
					//console.log('already review busy')
					round = rounds[ user.active_review_round ]
					retval = { text: dialogs['review.already'].text( {round,user} ), parse: parseHtml, receive:'review-category-0' } //console.log('with round',round)
								console.log('fuck 1.5',parseHtml)
				} else {
					console.log(`finding review round for user ${user.id}`)
					round = app.roundToLead( user )
					console.log('app-round created',round)
					retval = { text: dialogs['review.started'].text( { round, user } ) }
				}
				break
			case 'review_categories':
							console.log('fuck 2',parseHtml)
				user = data.user
				round = appData.rounds[user.active_review_round]
				const { needed: needed } = app.roundReviewCategories( round, user )
				console.log('needed',needed)
				if (needed[0] === 'overview') {
					console.log('overview needded')
					retval = { 
						text: dialogs['review.overview'].text( { round, user }), 
						parse:parseHtml
					}
					user.receive = 'review-category-0'
				} else {
					console.log('other cats needed')
					retval = { 
						text:dialogs['review.categories.pick'].text(), 
						format: formatters.reviewer_categories( needed ), 
						parse:parseHtml
					}
				}
				break
			case 'review_category_request':
				user = data.user
				console.log('review category request',data)
				round = appData.rounds[user.active_review_round]
				console.log('round',round)

				catName = categories[data.category]
				console.log('cat name',catName)
				retval = { 
					text: dialogs['review.category.request'].text( {round, user, category:catName } ),
					parse: parseHtml
				}
				user.receive = 'review-category-'+data.category
				break
			case 'review_category': // input a category
				user = data.user
				//console.log('review category',data)
				round = appData.rounds[user.active_review_round]
				//console.log('round',round)

				catName = categories[data.category]
				//console.log('cat name',catName)
				let roundUser = round.users.find( roundUser => roundUser.uid == user.id )
				roundUser.sections[catName] = data.text
				//console.log('round is now',round)
				app.save()
				retval = { text: 'submitted' }
				break
			default: 
				console.log(`unknown command ${command}`)
		}
		console.log('retval',retval)
		return retval
	},

	runScript: name => {
		let script = scripts[name]
		console.log('running script ',script)

	},

	dialogs: {
		'welcome.new': {
			text: ({ user }) => `Welcome ${user.first_name}...what you can do with ratestream:`
		},
		'welcome.returning': {
			text: ({ user }) => `Welcome back ${user.first_name}`
		},
		'review.started': {
			text: ({round, user }) => {
				return (
					`great....you are now Lead as ${app.roundRole(round,user)} analyst for token ${token_name(round)}.`
					+ `\nTo lead the round, You will need to submit reviews for ${categories.toString()}.`
				)
			}
		},
		'review.overview': {
			text: ({ round, user }) => (
				`please submit <b>${app.roundRole(round,user)} overview</b> for <b>${token_name(round)}</b> now to get started`
			)
		},
		'review.already': {
			text: ({round, user}) => (
				`you are already ${app.roundRole( round, user )} reviewer for ${token_name(round)}`
			)
		},
		'review.categories.awaiting':{
			text: () => ``
		},
		'review.categories.pick': {
			text: () => 'pick a category to review now'
		},
		'review.category.request': {
			text: ({round,user,category}) => (
				`please submit <b>${app.roundRole(round,user)}</b> review of <b>${category}</b> for <b>${token_name(round)}</b>`
			)
		},
		'review.warning.round.ending': {
			text: () => `warning!  round ends in... Get your reviews in...still missing`
		},
		'rounds.clear': {
			text: () => 'rounds cleared'
		},
		'analysis.active': {
			text: ({ round, user }) => (
				`now active in round with token ${token_name(round)}` 
			)
		},
		'analysis.none': {
			text: () => `Sorry...no rounds to analyze right now`
		},
		'analysis.start': {
			text: ({ round, user }) => `starting analysis with token ${token_name(round)}`
		},
		'analysis.already': {
			text: ({ round, user }) => (
				`you are already analyst in round with token ${token_name(round)}`
			)
		},
		'analysis.question.next':{
			text: ({ round, user}) => {
				let roundUser = round.users.find( roundUser => roundUser.uid == user.id )
				return 'next question: \n' + app.data.analyst_questions[roundUser.question].text
			}
		},
		'sample.summary': {
			text: ({}) => ``
		},

		'token.notfound': {
			text: ({tokenName}) => `no token ${tokenName} in our library`
		},
		'tokens': {
			text: () => `Covered Tokens`
		}
	}
}

app.runScript('test.user.1')
const dialogs = app.dialogs

const token_name = round => appData.tokens[round.token].name

module.exports = app



