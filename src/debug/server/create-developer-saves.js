'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnServerReady',
  deps: ['Config', 'On'],
  func: function OnServerReady (config, on) {
    return function spinupDeveloperSaves (path, project) {
      if (!config().debug.develop) {
        return;
      }

      each(project.modes, function (mode) {
        var save = {id: mode, mode: mode};
        on().newSave(save);
        on().saveReady(save);
      });
    };
  }
};