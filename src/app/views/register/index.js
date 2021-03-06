// @flow weak

import { bindActionCreators } from 'redux'
import { connect }            from 'react-redux'
import * as viewsActions      from '../../redux/modules/views'
//import * as userAuthActions   from '../../redux/modules/userAuth'

import { userActions } from '../../redux/modules/actions'
import Register                  from './Register'


const mapStateToProps = (state) => {
  return {
    currentView:      state.views.currentView,

    isFetching:       state.user.isFetching,
    registering:      state.user.registering,
    user:             state.user 
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      ...viewsActions,
      ...userActions
    },
    dispatch
  )
}

export default connect( mapStateToProps, mapDispatchToProps )(Register)
