// @flow weak

// #region imports
import React, { Component }   from 'react'
import PropTypes              from 'prop-types';
import {
  Header,
  // Footer,
  AsideLeft,
  AsideRight
}                             from '../../components'
import { Modals }             from '../../views'
import config              from '../../config/appConfig'
import { navigation }         from '../../models'
import MainRoutes             from '../../routes/MainRoutes'
import auth                   from '../../services/auth'

import UserIMG                from '../../img/user.jpg'
// #endregion


//import 'bootstrap/dist/css/bootstrap.css'


class App extends Component {
  static propTypes = {
    // react-router 4:
    match:    PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    history:  PropTypes.object.isRequired,

    sideMenuIsCollapsed: PropTypes.bool,
    /*userInfos:  PropTypes.shape({
      login:       PropTypes.string,
      firstname:   PropTypes.string,
      lastname:    PropTypes.string,
      picture:     PropTypes.string,
      showPicture: PropTypes.bool
    }),
    */
    userIsConnected: PropTypes.bool,
    currentView:     PropTypes.string,

    actions: PropTypes.shape({
      enterHome: PropTypes.func,
      leaveHome: PropTypes.func,
      fetchEarningGraphDataIfNeeded: PropTypes.func,
      fetchUserInfoDataIfNeeded:     PropTypes.func,
      openSideMenu:   PropTypes.func,
      closeSideMenu:  PropTypes.func,
      toggleSideMenu: PropTypes.func
    })
  };

  state = {
    appName:          config.APP_NAME,
    connectionStatus: config.CONNECTION_STATUS,
    helloWord:        config.HELLO_WORD
  };


  // #region lifecycle methods
  componentDidMount() {
    //console.log('component did mount props',this.props)
    const {
      actions: {
        //fetchUserInfoDataIfNeeded,
        //refreshInfo,
        fetchTokensDataIfNeeded,
        clear,  // alert
        getSideMenuCollapsedStateFromLocalStorage
      },
      history
    } = this.props;

    history.listen((location, action) => {
      // clear alert on location change
      console.log('location change in app',location,action)
      clear()
    })

    fetchTokensDataIfNeeded()
    //refreshInfo()
    //fetchUserInfoDataIfNeeded();
    getSideMenuCollapsedStateFromLocalStorage()
  }

  componentWillMount() {
    const { actions: { login } } = this.props

    let user = auth.getUserInfo()
    console.log('user from local storage',user)
    if (user) {
      login( user.email, user.password, false )  // login, don't reload
    }
  }

  render() {
    const { appName, connectionStatus, helloWord } = this.state
    const { 
      //userInfos, 
      userIsConnected, 
      sideMenuIsCollapsed, 
      currentView, 
      alert,
      user,
      userAuth
    } = this.props
    //console.log('props in app',this.props)

    //const userFullName = `${userInfos.firstname} ${userInfos.lastname.toUpperCase()}`;
    const userFullName = user.name ? user.name : '' // should not get here if not logged in but during testing
    const username = user.name ? user.name: ''
    //console.log( 'alert:',alert )
    return (
      <div>
        <Header
          appName={appName}
          userLogin={username}
          userFirstname={userFullName}
          userLastname={""}
          userPicture={UserIMG}
          showPicture={user.showPicture}
          currentView={currentView}
          toggleSideMenu={this.handlesMenuButtonClick}
          onLogout={this.handlesOnLogout}
        />
        <div className="wrapper row-offcanvas row-offcanvas-left">
          <AsideLeft
            isAnimated={true}
            sideMenu={navigation.sideMenu}
            currentView={currentView}
            isCollapsed={sideMenuIsCollapsed}
            helloWord={helloWord}
            connectionStatus={connectionStatus}
            userIsConnected={userAuth.loggedIn}
            username={userFullName}
            userPicture={ user.picture || UserIMG }
            showPicture={ user.showPicture }
          />
          <AsideRight isAnimated={true} isExpanded={sideMenuIsCollapsed} >
            {alert.message &&
              <div className={`alert ${alert.type}`}>{alert.message}</div>
            }
            <MainRoutes />
          </AsideRight>
        </div>
        {/* <Footer /> */}
        {/* modals cannot be placed anywhere (avoid backdrop or modal placement issues) so all grouped in same component and outside .wrapper*/}
        <Modals />
      </div>
    );
  }
  // #endregion

  handlesMenuButtonClick = (event) => {
    if (event) {
      event.preventDefault();
    }
    const { actions: { toggleSideMenu } } = this.props;
    toggleSideMenu();
  }

  handlesOnLogout = (event: any) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    // clear all application storage
    auth.clearAllAppStorage()
    // redirect to login
    const { history } = this.props
    history.push('/')
    window.location.reload()
  }
}

export default App;
