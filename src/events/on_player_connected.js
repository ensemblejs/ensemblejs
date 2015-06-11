'use strict';

module.exports = {
  type: 'OnPlayerConnected',
  deps: ['StateAccess', 'NewState'],
  func: function (state, newState) {
    return function (gameId) {
      var playerCount = state().for(gameId, 'ensemble').get('players');

      return newState.create('ensemble', { players: playerCount + 1 });
    };
  }
};