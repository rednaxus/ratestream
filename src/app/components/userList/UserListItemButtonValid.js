// @flow weak

import React      from 'react';
import PropTypes  from 'prop-types';

const UserListItemButtonValid = ({
  onClick
}) => (
  <button
    className="btn btn-default btn-xs"
    onClick={onClick}>
    <i className="fa fa-check"></i>
  </button>
);

UserListItemButtonValid.propTypes = {
  onClick: PropTypes.func
};

export default UserListItemButtonValid;
