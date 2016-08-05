'use strict';

var addTrailingSlash = require('../../util/path').addTrailingSlash;
var normaliseRelativePath = require('../../util/path').normaliseRelativePath;
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');

module.exports = {
  type: 'OnDatabaseReady',
  deps: ['On', 'SyncMutator'],
  func: function CreateTestSaves (on, mutateNow) {
    return function spinupTestSeeds () {
      if (!config.get().debug.develop) {
        return;
      }

      const path = config.get().game.path;
      const absolutePath = normaliseRelativePath(addTrailingSlash(path + '/seeds'));

      require('fs').readdirSync(absolutePath).forEach(file => {
        if (file.substr(-5) !== '.json') {
          return;
        }

        let seed = require(absolutePath + file);
        if (!seed.ensemble.mode) {
          logger.error('Seed file is missing mode', {file: file, seed: seed});
        }

        seed.ensemble.saveId = file.replace('.json', '');

        let save = {
          id: seed.ensemble.saveId,
          mode: seed.ensemble.mode
        };

        on().newSave(save);
        mutateNow()(save.id, seed);
        on().saveReady(save);
      });
    };
  }
};