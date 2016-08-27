'use strict';

const config = require('../../util/config');

module.exports = {
  type: 'OnDatabaseReady',
  deps: ['On', 'StateTracker'],
  func: function OnServerReady (on, tracker) {
    return function spinupDeveloperSaves () {
      if (!config.get().debug.develop) {
        return;
      }

      config.get().game.modes.forEach(function (mode) {
        const save = {id: mode, mode};
        on().newSave(save);
        tracker().sync();
        on().saveReady(save);
      });
    };
  }
};