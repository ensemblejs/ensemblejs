'use strict';

module.exports = {
  type: 'SaveGame',
  deps: ['GamesDataModel', 'RawStateAccess'],
  func: function SaveGame (games, raw) {

    function now (state) {
      games().save(raw.for(state.get('ensemble.gameId')), function () {});
    }

    return {
      now: now
    };
  }
};