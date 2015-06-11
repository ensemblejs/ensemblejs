'use strict';

module.exports = {
  type: 'OnPlayerDisconnected',
  deps: ['StateAccess', 'NewState'],
  func: function (state, newState) {
    return function (gameId) {
      var playerCount = state().for(gameId, 'ensemble').get('players');

      var data = {
        paused: true,
        players: playerCount - 1
      };

      return newState.create('ensemble', data);
    };
  }
};