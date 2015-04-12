'use strict';

module.exports = {
  type: 'OnPlayerConnected',
  deps: ['StateAccess'],
  func: function (state) {
    return function () {
      return {
        inch: {
          players: state().get('players') + 1
        }
      };
    };
  }
};