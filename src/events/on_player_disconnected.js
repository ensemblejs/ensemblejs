'use strict';

module.exports = {
  type: 'OnPlayerDisconnected',
  deps: ['StateAccess'],
  func: function (state) {
    return function () {
      return {
        inch: {
          paused: true,
          players: state().get('players') - 1
        }
      };
    };
  }
};