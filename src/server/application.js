
const fs = require('fs')

const config = require('../app/config/appConfig')
const survey = require('../app/services/survey')


let appData = require('./app.json')

var saveTimer

module.exports = {
	data: appData,

	start: () => {  // start app
		saveTimer = setInterval( ()=> {
			module.exports.save()
		}, 600000 ) 
		// save me timer here

		module.exports.translateSurvey()

	},
	stop: () => {
		clearInterval(saveTimer)
	},
	save: () => {
		fs.writeFileSync('../app.json', JSON.stringify(appData,null,2), 'utf8')
	},


	translateSurvey: () => {
		let questions = survey.getElements()
		console.log(questions)
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
	},

	startTokens: () => {

	},
	stopTokens: () => {

	},
}




