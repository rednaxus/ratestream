

const moment = require('moment')
const config = require('../app/config/appConfig')

const categories = config.review_categories

var app = require('./application')


const { rounds, tokens, users, analyst_questions } = app.data

module.exports = {
	'welcome.new': {
		text: ({ user }) => `Welcome ${user.first_name}...what you can do with ratestream:`
	},
	'welcome.returning': {
		text: ({ user }) => `Welcome back ${user.first_name}`
	},
	'review.started': {
		text: ({round, user }) => `great....you are now to lead as ${role} analyst for token ${token.name}.  \
			\nTo lead the round, You will need to submit reviews for ${categories.toString()}. \ 
			\nBegin by submitting an ${categories[0]} paragraph:`
	},
	'review.overview': {
		text: ({ round, user }) => `please submit ${app.roundRole()} overview for ${token.name} to get started`
	},
	'review.already': {
		text: ({round, user}) => {
			let role = app.roundRole( round, user )
			`you are already ${role} reviewer for ${tokens[round.token].name} \
			\nReviews are still needed for ${categories.toString()}`
		}
	},
	'review.categories.awaiting':{
		text: ({}) => ``
	},

	'review.warning.round.ending': {
		text: ({}) => `warning!  round ends in... Get your reviews in...still missing`
	},
	'analysis.active': {
		text: ({ round, user }) => (
			`now active in round with token ${tokens[round.token].name}` 
		)
	},
	'analysis.none': {
		text: () => `Sorry...no rounds to analyze right now`
	},
	'analysis.start': {
		text: ({ round, user }) => `starting analysis with token ${tokens[round.token].name}`
	},
	'analysis.already': {
		text: ({ round, user }) => (
			`you are already analyst in round with token ${tokens[round.token].name}`
		)
	},
	'analysis.question.next':{
		text: ({ round, user}) => {
			let roundUser = round.users.find( roundUser => roundUser.user == user.id )
			return 'next question: \n' + analyst_questions[roundUser.question].text
		}
	},
	'sample.summary': {
		text: ({}) => ``
	},


}


