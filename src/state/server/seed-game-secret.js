'use strict';

const config = require('../../util/config');

module.exports = {
  type: 'OnNewSave',
  deps: ['UUID'],
  func: function OnNewSave (uuid) {
    return function seedSaveSecret () {
      return {
        ensemble: {
          secret: config.get().debug.develop ? 'public-ask' : uuid().gen()
        }
      };
    };
  }
};