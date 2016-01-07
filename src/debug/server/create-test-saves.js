'use strict';

var addTrailingSlash = require('../../util/path').addTrailingSlash;
var normaliseRelativePath = require('../../util/path').normaliseRelativePath;
var logger = require('../../logging/server/logger').logger;

module.exports = {
  type: 'OnServerReady',
  deps: ['Config', 'On', 'StateMutator'],
  func: function OnServerReady (config, on, mutate) {
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
          logger.error('Seed file is missing mode', {file: file, seed: seed});
        }

        var name = file.replace('.json', '');
        seed.ensemble.saveId = name;

        var save = {
          id: seed.ensemble.saveId,
          mode: seed.ensemble.mode
        };

        on().newSave(save);
        mutate()(save.id, seed);
        on().saveReady(save);
      });
    };
  }
};