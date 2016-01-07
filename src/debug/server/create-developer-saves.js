'use strict';

var each = require('lodash').each;
var config = require('../../util/config');

module.exports = {
  type: 'OnServerReady',
  deps: ['On'],
  func: function OnServerReady (on) {
    return function spinupDeveloperSaves (path, project) {
      if (!config.get().debug.develop) {
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