
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
let time = require('./time.json')

var { tokens, users, analyst_questions, reviewer_questions, rounds, reviews } = appData

var testUsers = users.filter( user => user.first_name.startsWith('tester_'))

//const dialogs = require('./dialogs')
const formatters = require('./bots/formatters')


const categories = config.review_categories


const commands = [
	'review',
	'analyze',
	'activity',	// includes rounds you are and have been involved in, and outcomes
	'news',
	'token <name>',
	'tokens',
	'summaries',
	'refreshInfo',
	'refreshTokens',
	'refreshTopTokens',
	'clearRounds',
	'refreshInfo',
	'time',
	'cron'
]

var saveTimer
var cronTimer

const round_window = 3600*8 // 8 hours
const round_window_min = 3600*2 // 2 hours, minimum window left for a second lead to be added
const tally_window = 3600*24*7   // window from now to consider tallies (e.g. 1 week)
const WEEK = 3600*24*7
const DAY = 3600*24
const MONTH = 3600*24*28

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

var now = time.last_time // config.timebase //() => Math.round(+new Date() / 1000) // can fix time from here
var last_tally = now
var time_str = time => `${time}:${moment(time*1000).format('YYYY-MM-DD hh:mm:ss')}`
console.log(`app-time at start ${time_str(now)}`)

const randomInt = max => Math.floor( Math.random() * Math.floor( max ) )
const randomIdx = length => randomInt( length - 1 )	// random int starting at 0 to e.g. length-1 

const round_user = ( round, user ) => round.users.find( roundUser => roundUser.uid == user.id )


const periods = [ 
	{ name:'day', value: DAY },
	{ name: 'week', value: WEEK },
	{ name: 'month', value: MONTH }
]

const app = {
	...info,
	data: appData,
	time: () => now,
	cron: forward_seconds => { 
		now += forward_seconds 
		time.last_time = now
		fs.writeFileSync('../time.json', JSON.stringify(time,null,2), 'utf8')
	},
	start: ( autosave = true, cb ) => {  // start app
		if (autosave) saveTimer = setInterval( ()=> {
			let changes = module.exports.roundsAssess()
			if (cb) cb( changes )
			console.log(`autosaving at ${time_str(now)}`)
			app.save()
		}, 600000 )
		// time
		cronTimer = setInterval( () => app.cron( 10 ), 10000 )
		tokens.forEach( (token,idx) => console.log( `[${idx}] ${token.name}` ) )
		users.forEach( user => user.receive = null ) // clear out previous state (for development)
		//console.log('not covere',appData.tokens_not_covered)

		console.log(`${now}: tokens covered:${tokens.length}...tokens in db but not covered:${Object.keys(appData.tokens_not_covered).length}`)
	},
	stop: () => {
		clearInterval(saveTimer)
	},
	save: () => {
		console.log(`${time_str(now)} saving app`)
		app.now = now
		fs.writeFileSync('../app.json', JSON.stringify(appData,null,2), 'utf8')
	},

	saveInfo: () => {
		console.log(`${now}: saving info`)
		fs.writeFileSync('../info.json', JSON.stringify(infoData,null,2), 'utf8')
	},

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

		console.log(`round to lead for ${user.first_name}`)

		let roundIdx
		let round
		let role
		let roundCandidates = rounds.reduce( ( candidates, round, idx ) => { 
			if (!round.users[1].uid && round.finish >= time + round_window_min) {
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
          payoff: 0,
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
 			return null
		}

		let roundsActive = rounds.reduce( (actives, round, idx) => {
			if (
				round.status === 'active' 
				&& round.users.findIndex( roundUser => roundUser.uid === user.id ) === -1  // user not in round already
			) actives.push(idx)
			return actives
		}, [] )
		if (!roundsActive.length ) {
			console.log('no valid rounds active')
			return null
		}

		console.log('sorting',roundsActive)
		roundsActive = roundsActive.sort( (r1,r2) => ( rounds[ r1 ].users.length - rounds[ r2 ].users.length ) )
		console.log('rounds active',roundsActive)

		// add jurist to round
		let juryRound = roundsActive[ 0 ]
		let round = rounds[juryRound]
		round.users.push({ 
			uid: user.id, 
			question: 0,
			phase: 0,
			phases: [{ // pre or post review
				start: now, 
				finish: 0, 	
				answers: new Array(analyst_questions.length).fill({}) 			
			},{
				start: 0,
				finish: 0,
				answers: new Array(analyst_questions.length).fill({})			
			}],
			sways: new Array(analyst_questions.length).fill(0)
		})
		user.active_jury_round = juryRound
		app.save()
		return round
	},
	roundsAssess: () => { // zorg should run every 10 minutes or so
		// tally results
		let timepassed = now - last_tally
		let tallies = {}
		let timebegin = now - tally_window

		// if round finished after beginning of window, include its numbers
		/*
		let questionsByCategory = analyst_questions.reduce( ( results, question, qIdx ) => {
			if (!results[question.category]) results[question.category] = [qIdx]
			else results[question.category].push(qIdx)
			return results
		}, {})
		console.log('questions by category', questionsByCategory )
		*/

		// windowed_rounds
		rounds.filter( round => round.finish >= timebegin ).forEach( round => {
			//console.log(`${now}:run round ${round.id} ${round.finish} ${round.status}` )

			let token = tokens[round.token]			
			let tally = {	 
				timestamp: now,
				answers: new Array(analyst_questions.length).fill().map( _ => ({count:0, avg:0, sway_count:0, avg_sway:0, winner:null})),
				categories: new Array(categories.length).fill().map( _ => ({count:0, avg:0, sway_count:0, avg_sway:0, winner:null }))
			}
			if (!token.tallies) token.tallies = [tally]
			else token.tallies.push(tally)
			// go through all the valid answers
			round.users.forEach( (rounduser,uIdx) => {
				if (uIdx < 2) return // not for leads

				analyst_questions.forEach( (question,qIdx) => {
					const whoWins = ( avg, avg_sway ) => {
						if (avg_sway > question.max * 0.2) return 0
						if (avg_sway < -question.max * 0.2) return 1
						return avg > question.max * 0.5 ? 0 : 1
					}
					let answer = rounduser.phases[1].answers[ qIdx ] || rounduser.phases[0].answers[ qIdx ] || null
					if (answer) { 

						let sway = rounduser.phases[1].answers[ qIdx ] && rounduser.phases[0].answers[ qIdx ] ? 
							{ value: rounduser.phases[1].answers[ qIdx ].value - rounduser.phases[0].answers[ qIdx ].value } : null 

						let categoryIdx = categories.findIndex( category => category == question.category )
						tallyCat = tally.categories[categoryIdx]
						tallyCat.avg = ( tallyCat.count * tallyCat.avg + answer.value ) / (tallyCat.count + 1)
						tallyCat.count++ 

						if (sway) {
							tallyCat.avg_sway = ( tallyCat.sway_count * tallyCat.avg_sway + sway.value ) / ( tallyCat.sway_count + 1 )
							tallyCat.sway_count++
							tallyCat.winner = whoWins( tallyCat.avg, tallyCat.avg_sway )
						}

						let tallyAnswer = tally.answers[qIdx]
						tallyAnswer.avg = ( tallyAnswer.count * tallyAnswer.avg + answer.value ) / ( tallyAnswer.count + 1 )
						tallyAnswer.count++			
						if (sway) {
							tallyAnswer.avg_sway = ( tallyAnswer.sway_count * tallyAnswer.avg_sway + sway.value ) / ( tallyAnswer.sway_count + 1 )
							tallyAnswer.sway_count++
							tallyAnswer.winner = whoWins( tallyAnswer.avg, tallyAnswer.avg_sway )
						}
					}
				})
			})
			
			// finish round if in need of finishing
			if (round.finish <= now && round.status == 'active') {
				console.log('expiring')
				app.roundExpire( round )
				// compute winners
			}
		})
		

		//console.log('tallies',tallies)
		//appData.tallies = tallies
		app.save()

		/* from veva: get winner
        uint8 r0 = uint8(round.averages[ 0 ][ 0 ]);
        uint8 r1 = uint8(round.averages[ 1 ][ 0 ]);
        if ( r1 > r0 + 20) round.winner = 0; if ( r1 - r0 > 20 )
        else if ( r1 < r0 - 20) round.winner = 1; if (r1 - r0 < -20)
        else if ( r1 > 50 ) round.winner = 0;		if r1 > 50
        else round.winner = 1;
		*/
		

		// finalize expired rounds
		//let expireRounds = rounds.filter( round => round.status === 'active' && round.finish <= now)
		//expireRounds.forEach( app.roundExpire )

		last_tally = now
		return { /* analysts_change_stage:[], analysts_round_expired:[]   */ }
	},
	portfolio: () => {

	},
	ratingAtTime: (time, timewindow) => {

	},
	ratings: (  ) => { // get best current and previous ratings for different time windows
		let ratings = tokens.reduce( ( taccum, token, tIdx ) => {
			if (!token.tallies) return taccum
			taccum[tIdx] = ['current','previous'].reduce( (cpaccum, iteration,idx) => { 	
				cpaccum[iteration] =  periods.reduce( (accum, period, pIdx )=> {
					let time = idx ? now - period.value : now
					accum[period.name] = token.tallies.filter( 
						tally => tally.timestamp < time && tally.timestamp > (time - period.value) 
					).reduce( (tally_accum,tally) => {
						const blend = (aa, answer) => ({
							count: aa.count + answer.count, 
							avg: aa.count || answer.count ? ( aa.count * aa.avg + answer.count * answer.avg ) / ( aa.count + answer.count ) : 0
						})
						return { 
							answers: tally.answers.map( ( answer, aIdx) => blend( tally_accum.answers[idx], answer ) ),
							categories: tally.categories.map( ( category, cIdx) => blend( tally_accum.categories[cIdx], category ) )
						}
					},{ 
						answers: new Array(analyst_questions.length).fill().map( _ => ({ count: 0, avg: 0 })),
						categories: new Array(categories.length).fill().map( _ => ({ count: 0, avg: 0 }))
					})
					return accum
				},{})
				return cpaccum
			}, {})
			return taccum
		},{}) 

		
		for (let [key,value] of entries(ratings)) {
			appData.tokens[key].rating = value
			appData.tokens[key].rating.timestamp = now
		} 
		app.save()
		
		console.log('result',JSON.stringify(ratings))
		/*
		{ 	
			averages: {
				current: { day: [{count,value},...], week: [], month: [] },
				previous: { day: [], week: [], month: [] }
		}
		*/
	},
	roundExpire: ( round ) => {
		// compute sways and points

		console.log('round expire',round.id)
		round.users.forEach( rounduser => {// remove users references
			let user = users[rounduser.uid]
			if (user.active_jury_round === round.id) {
				user.active_jury_round = -1
				rounduser.question = -1
				rounduser.phase = -1
			}
			else if (user.active_lead_round === round.id) {
				user.active_lead_round = -1
			}
		})
		round.status = 'finished'
		//app.save()
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
		ethplorer.getTopTokens().then( tops => {
			//appData.tokens_top = tops
			let toptokens = tops.data.tokens
			//console.log('tops',toptokens )
			toptokens.forEach( toptoken => {
				let tokenFound = appData.tokens.findIndex( token => token.name === toptoken.name )
				if (tokenFound === -1) {
					let name = toptoken.name.trim()
					console.log(`${now} adding token ${name}`)
					appData.tokens.push( { address: toptoken.address, name: name, markets: [] } )
					tokenFound = appData.tokens.length - 1
				}
				//appData.tokens[ tokenFound ].markets.push( { timestamp: now, ...toptoken } )
			})
			app.save()
		}).catch( err => console.log(err) )
	},
	refreshTokens: () => {
		doFetch = () => {
			let token = appData.tokens[nextTokenFetch]
			if (!token.markets) token.markets = []
			//console.log('fetch token with address',token.address)
			fetchToken( token.address ).then( marketData =>{
				console.log(`${now}: got token ${token.name} data`)
				token.markets.push( { timestamp: now, ...marketData } )
				//console.log(appData.tokens)
				if (++nextTokenFetch === appData.tokens.length ) {
					console.log('finish fetching tokens')
					app.save()
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
	identify: msg => { // who am i
		let t_user = msg.from
		let chat = msg.chat ? msg.chat.id : null

		let idx = appData.users.findIndex( user => user.t_id === t_user.id )

		if (idx !== -1) return appData.users[idx]

		// first time in, create user
		let user = { 
			id: appData.users.length,
			...refcode.getRefCodePair(),
			t_id: 					t_user.id, 
			t_chat_id: 			chat,
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
	roundReviews: (round) => {
		return categories.reduce( ( result, category, cidx ) => {
			if (!round.users[0].sections[category] && !round.users[1].sections[category]) return result
			let reply = [
				round.users[0].sections[category] || '[-no review-]',
				round.users[1].sections[category] || '[-no review-]'
			]
			console.log('reply',reply)
			return `${result}\n\n<b>${category}</b>\n\n<i>bull:</i> ${reply[0]}\n\n<i>bear:</i> ${reply[1]}`
		},'')
	},
	say: (command, data = {}) => { // command processor for the app
		var retval
		let round
		let user = data.user
		let catName
		let roundUser
		let question_number
		let answer
		let question
		let phase
		let token

		//var ret = (text,format) => ({ text:text, format:format })
		console.log(`command is ${command}`,data)
		switch (command) {
			case 'commands': 
				retval = { text: dialogs['commands'].text() }
				break
			case 'activity':
				break
			case 'account':
				break
			case 'news':
				break
			case 'news_refresh':
				app.refreshInfo()
				retval = { text: dialogs['news.refresh'].text() }
				break
			case 'ratings':
				app.ratings()
				retval = { text: dialogs['token.ratings'].text() }
				break
			case 'summaries':
				break
			case 'cron':
				app.cron( data.delta )
				retval = { text: formatters.apptime( app.time() ) }
				break
			case 'time':
				console.log('time')
				retval = { text: formatters.apptime( app.time() ) }
				break
			case 'analyze':
				console.log('analyze',user)
				if (user.active_jury_round !== -1) {
					round = rounds[ user.active_jury_round ]
					console.log('got round',round)
					roundUser = round.users.find( roundUser => {
						return roundUser.uid == user.id 
					})
					console.log('got round user',roundUser)
					retval = { text: dialogs['analysis.already'].text( { round, user }) }
					//user.receive = 'question-'+roundUser.question
				
				} else {
					round = app.roundToAnalyze( user )
					console.log('round to analyze',round)
					if (round) {
						retval = { text: dialogs['analysis.active'].text( { round, user }) }
						//user.receive = 'question-0' 
					} else {
						retval = { text: dialogs['analysis.none'].text(), status:-1 }
					}
				}
				break

			case 'roundsClear':
				console.log('rounds clear')
				app.clearRounds()
				retval = { text: dialogs['rounds.clear'].text() }
				break
			case 'questions':
				retval = { text: formatters.analyst_questions( analyst_questions ) }
				break
			case 'question':
				round = rounds[user.active_jury_round]
				roundUser = round.users.find( roundUser => roundUser.uid == user.id )
				zorg
				// put analysts in proper pre or post stage
				retval = { 
					text: dialogs['analysis.question'].text({ round, user }), 
					format: formatters.analyst_question(analyst_questions[roundUser.question],roundUser.question),
					parse:parseHtml
				}

				break
			case 'question_answer': // answered question
				question_number = data.question_number
				answer = data.answer
				round = rounds[user.active_jury_round]
				roundUser = round.users.find( roundUser => roundUser.uid == user.id )
				phase = roundUser.phases[roundUser.phase]
				phase.answers[question_number] = { value: answer, timestamp: now }
				roundUser.question = phase.answers.findIndex( answer => !answer.timestamp )
				console.log('next question',roundUser.question)

				if (roundUser.question == -1) { // finished phase...todo: time check for 10 minute limit
					phase.finish = now
					if (roundUser.phase == 2) {
						console.log('!! programmer error, should not be here in phase 2')
					}
					if (roundUser.phase == 1) {
						user.active_jury_round = -1
						retval = { text: dialogs['analysis.finished'].text({ round, user }), parse:parseHtml }
						roundUser.phase = 2
					} else { // move to next phase
						roundUser.phase = 1
						roundUser.question = 0
						phase = roundUser.phases[1]
						phase.start = now
						retval = { text: dialogs['analysis.finish.pre'].text( { round, user} ), parse:parseHtml, status: 1 }
					}
				} else {
					retval = {
						text: dialogs['analysis.question'].text({ round, user }),
						format: formatters.analyst_question(analyst_questions[roundUser.question],roundUser.question),
						parse:parseHtml
					}
				}
				app.save()
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
				break
			case 'tokens_refresh':
				app.refreshTokens() // can do this on regular interval
				retval = { text:dialogs['tokens.refresh'].text() }
				break
			case 'tokens_top':
				app.refreshTopTokens()
				retval = { text: dialogs['tokens.top'].text() }
				break
			case 'token':
				let tokenId = Number.isInteger(data.id) ? data.id : app.getTokenId( data.name )
				console.log(`checking token ${tokenId}`)
				if( tokenId === -1)
					retval = { text:dialogs['token.notfound'].text( {tokenName:data.name} ) } 
				else {
					token = tokens[tokenId]
					let markets = token.markets
					let current = markets[markets.length-1]
					//retval = { text: formatters.tokenMarket( current ), parse: parseHtml }
					retval = { 
						text: dialogs['token'].text( { tokenName:token.name, market: current, rating:token.rating } ),
						format: formatters.token( token, tokenId ),
						parse: parseHtml
					}
				}
				break
			case 'review':
				if ( user.active_review_round !== -1 ) {
					//console.log('already review busy')
					round = rounds[ user.active_review_round ]
					retval = { text: dialogs['review.already'].text( {round,user} ), parse: parseHtml } //console.log('with round',round)
				} else {
					console.log(`finding review round for user ${user.id}`)
					round = app.roundToLead( user )
					console.log('app-round created',round)
					retval = { text: dialogs['review.started'].text( { round, user } ) }
				}
				break
			case 'review_categories': // query for categories
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
				} else if ( needed.length > 0 ) {
					console.log('other cats needed')
					retval = { 
						text:dialogs['review.categories.pick'].text({round,user}), 
						format: formatters.reviewer_categories( needed ), 
						parse:parseHtml
					}
				} else {
					retval = {
						text:dialogs['review.categories.finished'].text({ round, user })
					}
				}
				break
			case 'review_category_request': // request to review category
				//console.log('review category request',data)
				round = appData.rounds[user.active_review_round]
				//console.log('round',round)

				catName = categories[data.category]
				//console.log('cat name',catName)
				retval = { 
					text: dialogs['review.category.request'].text( {round, user, category:catName } ),
					parse: parseHtml
				}
				user.receive = 'review-category-'+data.category
				break
			case 'review_category': // submit a category review
				user = data.user
				//console.log('review category',data)
				round = appData.rounds[user.active_review_round]
				//console.log('round',round)

				catName = categories[data.category]
				//console.log('cat name',catName)
				roundUser = round.users.find( roundUser => roundUser.uid == user.id )
				roundUser.sections[catName] = data.text
				//console.log('round is now',round)
				app.save()
				retval = { text: `review submitted for <b>${catName}</b>`, parse:parseHtml }
				break
			case 'tally':
				app.roundsAssess()
				retval = { text: 'rounds assessed' }
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
		'commands': {
			text: () => commands.reduce( ( result, command ) => (`${result}\n/${command}`), '')
		},
		'welcome.new': {
			text: ({ user }) => `Welcome ${user.first_name}...what you can do with ratestream:`
		},
		'welcome.returning': {
			text: ({ user }) => `Welcome back ${user.first_name}`
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
				`${user.first_name} you are already analyst in round with token ${token_name(round)}`
			)
		},
		'analysis.finish.pre': {
			text: ({ round, user }) => {
				// tell round is finished
				let reviews = app.roundReviews( round )
				return (
					`\n\npre-analysis finished!`
					// tell reviews submitted
					+`\n\nreviews:\n`
					+ app.roundReviews(round)
					// start questions
					+`\n\nnow the post review questions`
				)
			}
		},
		'analysis.reviews': {

		},
		'analysis.question':{
			text: ({ round, user}) => {
				let roundUser = round.users.find( roundUser => roundUser.uid == user.id )
				console.log('round user question ',roundUser)
				let question = analyst_questions[roundUser.question]
				return `${question.category}:${question.name}:${roundUser.phase ? '[post-review]':'[pre-review]'}\n\n${question.text}`
			}
		},
		'analysis.finished':{
			text: ({ round, user }) => 'All questions answered'
		},
		'news.refresh':{
			text: () => 'refreshing news information'
		},
		'review.started': {
			text: ({round, user }) => {
				return (
					`Great ${user.first_name}....you are now Lead as ${app.roundRole(round,user)} analyst for token ${token_name(round)}.`
					+ `\n\nTo lead the round, You will need to submit reviews for ${categories.map( category => `\n  ${category}`) }.`
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
				`${user.first_name}...you are already ${app.roundRole( round, user )} reviewer for ${token_name(round)}`
			)
		},
		'review.categories.awaiting':{
			text: () => ``
		},
		'review.categories.finished':{
			text: ({ round, user }) => `Great ${user.first_name}...all categories reviewed for ${token_name(round)}.  Good luck!`
		},
		'review.categories.pick': {
			text: ({ round, user }) => `${user.first_name} pick a category to review now`
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
		'rounds.tally': {
			text: () => 'rounds tallied'
		},
		'sample.summary': {
			text: () => ``
		},
		'token.notfound': {
			text: ({tokenName}) => `no token ${tokenName} in our library`
		},
		'token.ratings': {
			text: () => `got token ratings`
		},
		'token': {
			text: ( {tokenName, market, rating }) => {
				const chg = (curr, prev) => (!curr.count || !prev.count ? ' ' : ( curr.avg > prev.avg ? '⬆': (curr.avg < prev.avg ? '⬇': '↔' )))
		
				let str = `<b>${tokenName}</b>`
				//console.log('hello',market,JSON.stringify(rating))
				if (market.price) str += `\nprice <b>${market.price.rate}</b> ${market.price.currency}`
				let cats = {
					day: rating.current.day.categories.reduce( (str,cat,cidx) => (
						str + (cat.count == 0 ? '---' : cat.avg.toFixed(1)) + chg(cat,rating.previous.day.categories[cidx]) + ' '
					), ''),
					week: rating.current.week.categories.reduce( (str,cat,cidx) => (
						str + (cat.count == 0 ? '---' : cat.avg.toFixed(1)) + chg(cat,rating.previous.week.categories[cidx]) + ' '
					), ''),
					month: rating.current.month.categories.reduce( (str,cat,cidx) => (
						str + (cat.count == 0 ? '---' : cat.avg.toFixed(1)) + chg(cat,rating.previous.month.categories[cidx]) + ' '
					), '')
				}
				if (rating) {
					str
					str += `\n...ratings / change ↔⬆⬇` // 
					str += `\n\n<i>categories======</i>\n${categories.reduce((str,cat) => str + cat.substr(0,4) + ' ','')}`
					str += `\n\n<i>day</i>\n${cats.day}`
					str += `\n<i>week</i>\n${cats.week}`
					str += `\n<i>month</i>\n${cats.month}\n\n<i>======categories</i>\n`
				}
				return str
			}
		},
		'tokens': {
			text: () => `Covered Tokens`
		},
		'tokens.refresh': {
			text: () => `Refreshing tokens`
		},
		'tokens.top': {
			text: () => `Refreshing and acquiring top tokens (by market cap)`
		}
	},

	/* temporary code for various things */

}

app.runScript('test.user.1')
const dialogs = app.dialogs

const token_name = round => appData.tokens[round.token].name

module.exports = app



