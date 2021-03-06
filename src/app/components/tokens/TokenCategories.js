
import moment from 'moment'

import React from 'react'

import { Panel } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import survey from '../../services/survey'
import { tokenHistory } from '../../services/tokenomics'

const surveySections = survey.getSections()
const toDate = timestamp => moment(timestamp*1000).format('MM/DD/YY')

const TokenCategories = ( { rounds, tokens } ) => {
  //console.log('tokens',tokens)
  if (!tokens || !tokens.length) return ''
  /*const data = tokens.map( token => {
    let count = token.price && token.price.marketCapUsd ? token.price.marketCapUsd / 1000000000: 10
    return { id: token.id, value: token.name, count: count } 
  })
  */
  let history = tokenHistory( rounds, tokens, 5 ) // last 5 
  //console.log('history',history)
  return (
    <Panel className="panel-info card card-style">
      <Panel.Heading className="card-title">
        Token Summaries--recent 5 rounds
      </Panel.Heading>
      <Panel.Body className="card-text small">
        <div className="row table-header small">
          <div className="col-md-1"><em>token</em></div>
          { surveySections.map( ( section, idx ) => <div key={idx} className="col-md-1"><em>{section.name}</em></div> ) }
          <div className="col-md-1"><em>last round</em></div>
        </div>
        { history.map( ( historyItem, idx ) => 
          <div key={idx} className="row table-body">
            <div className="col-md-1">
              <Link to={ '/token/' + historyItem.token } >{ tokens.find( token=> token.id == historyItem.token ).name }</Link>
            </div>
            { historyItem.sectionAverages[1].map( ( avg, idx ) => <div key={idx} className="col-md-1">{avg}</div> ) }
            <div className="col-md-1">{ toDate( historyItem.lastrun ) }</div>
          </div>
        )}
      </Panel.Body>
    </Panel>

  )
}


export default TokenCategories
