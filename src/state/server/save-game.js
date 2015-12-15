'use strict';

module.exports = {
  type: 'SaveGame',
  deps: ['DbBridge'],
  func: function SaveGame (db) {

    function now (state) {
      db().saveGame(state.get('ensemble.gameId'));
    }

    return {
      now: now
    };
  }
};