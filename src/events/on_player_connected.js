'use strict';

module.exports = {
  type: 'OnPlayerConnected',
  deps: ['NewState'],
  func: function (newState) {
    return ['*', function (state) {
      var playerCount = state.for('ensemble').get('players');

      return newState.create('ensemble', { players: playerCount + 1 });
    }];
  }
};