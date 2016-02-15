'use strict';

var config = require('../../util/config').get();

module.exports = {
  type: 'OnNewSave',
  deps: ['UUID'],
  func: function OnNewSave (uuid) {
    return function seedSaveSecret () {
      var secret = config.debug.develop ? 'public' : uuid().gen();

      return ['ensemble', { secret: secret }];
    };
  }
};