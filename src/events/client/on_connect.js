'use strict';

module.exports = {
  type: 'OnConnect',
  deps: ['$'],
  func: function OnConnect ($) {
    return function hideDisconnectIcon () {
      $()('.disconnected').hide();
    };
  }
};