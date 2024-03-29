// @flow weak

import React, {
  PureComponent
}                         from 'react';
import PropTypes          from 'prop-types';
import {
  AnimatedView,
  Panel,
  TeamMates,
  TeamMember,
  TeamMateAddButton
}                         from '../../../components';

import DamonIMG           from '../../../img/Damon.png';
import JoeIMG             from '../../../img/Joe.png';
import EmmaIMG            from '../../../img/Emma.png';
import JannieIMG          from '../../../img/Jannie.png';

class TeamMatesView extends PureComponent {
  enterAnimationTimer = null;

  state = {
    members: [
      {
        picture:      DamonIMG,
        firstname:    'Damon',
        lastname:     'Parker',
        profile:      'Admin',
        profileColor: 'danger'
      },
      {
        picture:      JoeIMG,
        firstname:    'Joe',
        lastname:     'Waston',
        profile:      'Member',
        profileColor: 'warning'
      },
      {
        picture:      JannieIMG,
        firstname:    'Jannie',
        lastname:     'Davis',
        profile:      'Editor',
        profileColor: 'warning'
      },
      {
        picture:      EmmaIMG,
        firstname:    'Emma',
        lastname:     'Welson',
        profile:      'Editor',
        profileColor: 'success'
      }
    ]
  };

  componentWillMount() {
    const { actions: { enterTeamMatesView } } = this.props;
    enterTeamMatesView();
  }

  componentWillUnmount() {
    const { actions: { leaveTeamMatesView } } = this.props;
    leaveTeamMatesView();
    clearTimeout(this.enterAnimationTimer);
  }

  render() {
    const { members } = this.state;
    return(
      <AnimatedView>
        {/* preview: */}
        <div className="row">
          <div className="col-xs-12">
            <Panel
              hasTitle={true}
              title={'Teammates'}>
              <TeamMates>
                {
                  members.map(
                    (member, memberIndex) => {
                      return (
                        <TeamMember
                          key={memberIndex}
                          picture={member.picture}
                          firstname={member.firstname}
                          lastname={member.lastname}
                          profile={member.profile}
                          profileColor={member.profileColor}
                        />
                      );
                    }
                  )
                }
              </TeamMates>
              <TeamMateAddButton onAdd={ ()=> console.log('hello') }/>
            </Panel>
          </div>
        </div>
      </AnimatedView>
    );
  }
}

TeamMatesView.propTypes= {
  actions: PropTypes.shape({
    enterTeamMatesView: PropTypes.func.isRequired,
    leaveTeamMatesView: PropTypes.func.isRequired
  })
};

export default TeamMatesView;
