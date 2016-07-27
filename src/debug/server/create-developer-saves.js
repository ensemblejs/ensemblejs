'use strict';

import {each} from 'lodash';
var config = require('../../util/config');

module.exports = {
  type: 'OnDatabaseReady',
  deps: ['On', 'StateTracker'],
  func: function OnServerReady (on, tracker) {
    return function spinupDeveloperSaves () {
      if (!config.get().debug.develop) {
        return;
      }

      each(config.get().game.modes, function (mode) {
        const save = {id: mode, mode};
        on().newSave(save);
        tracker().sync();
        on().saveReady(save);
      });
    };
  }
};