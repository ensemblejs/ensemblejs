'use strict';

const config = require('../../util/config');

module.exports = {
  type: 'OnNewSave',
  func: function OnNewSave () {
    return function seedSaveInfo (save) {
      return {
        ensemble: {
          saveId: save.id,
          gameId: config.get().game.id,
          mode: save.mode
        }
      };
    };
  }
};