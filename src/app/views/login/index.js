// @flow weak

import { bindActionCreators } from 'redux';
import { connect }            from 'react-redux';
import * as viewsActions      from '../../redux/modules/views';
//import * as userAuthActions   from '../../redux/modules/userAuth';

import { userActions } from '../../redux/modules/actions'

import Login                  from './Login';


const mapStateToProps = (state) => {
  return {
    // views:
    currentView:  state.views.currentView,

    // useAuth:
    isAuthenticated:  state.user.isAuthenticated,
    isFetching:       state.user.isFetching,
    loggingIn:        state.user.loggingIn,
    user:             state.user
  };
};

const mapDispatchToProps = (dispatch) => {
  console.log('user actions',userActions)
  return bindActionCreators(
    {
      ...viewsActions,
      ...userActions
    },
    dispatch
  );
};

export default connect( mapStateToProps, mapDispatchToProps )(Login)
