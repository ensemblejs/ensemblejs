'use strict';

let config = require('../../util/config').get();

module.exports = {
  type: 'OnNewSave',
  deps: ['UUID'],
  func: function OnNewSave (uuid) {
    return function seedSaveSecret () {
      let secret = config.debug.develop ? 'public-auto' : uuid().gen();

      return ['ensemble', { secret: secret }];
    };
  }
};