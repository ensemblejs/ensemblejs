'use strict';

module.exports = {
  type: 'OnNewGame',
  func: function OnNewGame () {
    return function seedGameInfo (game) {
      return ['ensemble', {
        gameId: game.id,
        mode: game.mode
      }];
    };
  }
};