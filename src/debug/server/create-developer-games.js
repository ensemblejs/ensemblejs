'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnServerReady',
  deps: ['Config', 'On'],
  func: function OnServerReady (config, on) {
    return function spinupDeveloperGames (path, project) {
      if (!config().debug.develop) {
        return;
      }

      each(project.modes, function (mode) {
        var game = {id: mode, mode: mode};
        on().newGame(game);
        on().gameReady(game);
      });
    };
  }
};