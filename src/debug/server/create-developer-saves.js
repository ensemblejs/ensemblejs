'use strict';

var each = require('lodash').each;
var config = require('../../util/config');

module.exports = {
  type: 'OnDatabaseReady',
  deps: ['On'],
  func: function OnServerReady (on) {
    return function spinupDeveloperSaves () {
      if (!config.get().debug.develop) {
        return;
      }

      const modes = config.get().game.modes;

      each(modes, function (mode) {
        var save = {id: mode, mode: mode};
        on().newSave(save);
        on().saveReady(save);
      });
    };
  }
};