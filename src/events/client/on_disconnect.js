'use strict';

module.exports = {
  type: 'OnDisconnect',
  deps: ['$'],
  func: function OnDisconnect ($) {
    return function showDisconnectIcon () {
      $()('.disconnected').show();
    };
  }
};