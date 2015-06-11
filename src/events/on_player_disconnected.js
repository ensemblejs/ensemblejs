'use strict';

module.exports = {
  type: 'OnPlayerDisconnected',
  deps: ['NewState'],
  func: function (newState) {
    return ['*', function (state) {
      var playerCount = state.for('ensemble').get('players');

      var data = {
        paused: true,
        players: playerCount - 1
      };

      return newState.create('ensemble', data);
    }];
  }
};