'use strict';

module.exports = {
  type: 'OnPlayerConnected',
  deps: ['StateAccess'],
  func: function (state) {
    return function () {
      return {
        ensemble: {
          players: state().get('players') + 1
        }
      };
    };
  }
};