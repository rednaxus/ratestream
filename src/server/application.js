
const fs = require('fs')
const moment = require('moment')


const config = require('../app/config/appConfig')

const roundsService = require('../app/services/API/rounds')
const cyclesService = require('../app/services/API/cycles')
const tokensService = require('../app/services/API/tokens')

const tokenomics = require('../app/services/tokenomics')
const statusService = require('../app/services/analystStatus')

const utils = require('../app/services/utils') // parseB32StringtoUintArray, toHexString, bytesToHex, hexToBytes




const ethplorer = require('../app/services/API/ethplorer.js')



const survey = require('../app/services/survey')


let appData = require('./app.json')

var saveTimer


const fetchToken = address => new Promise( (resolve, reject) => {
	ethplorer.getTokenInfoExt(address).then( result => {
		//console.log('got result',result)
		resolve( result.data )
	}).catch( reject )
})

var nextTokenFetch = 0

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
}




