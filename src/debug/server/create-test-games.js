'use strict';

var addTrailingSlash = require('../../util/path').addTrailingSlash;
var normaliseRelativePath = require('../../util/path').normaliseRelativePath;

module.exports = {
  type: 'OnServerReady',
  deps: ['Config', 'On', 'Logger', 'StateMutator'],
  func: function OnServerReady (config, on, logger, mutate) {
    return function spinupTestSeeds (path) {
      if (!config().debug.develop) {
        return;
      }

      var absolutePath = normaliseRelativePath(addTrailingSlash(path + '/seeds'));

      require('fs').readdirSync(absolutePath).forEach(function(file){
        if (file.substr(-5) !== '.json') {
          return;
        }

        var seed = require(absolutePath + file);
        if (!seed.ensemble.mode) {
          logger().error('Seed file is missing mode', {file: file, seed: seed});
        }

        var name = file.replace('.json', '');
        seed.ensemble.gameId = name;

        var game = {
          id: seed.ensemble.gameId,
          mode: seed.ensemble.mode
        };

        on().newGame(game);
        mutate()(game.id, seed);
        on().gameReady(game);
      });
    };
  }
};