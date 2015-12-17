'use strict';

module.exports = {
  type: 'SaveGame',
  deps: ['DbBridge', 'RawStateAccess'],
  func: function SaveGame (db, raw) {

    function now (state) {
      db().saveGame(raw.for(state.get('ensemble.gameId')));
    }

    return {
      now: now
    };
  }
};