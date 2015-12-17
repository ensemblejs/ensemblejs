'use strict';

var config = require('../../util/config').get();

module.exports = {
  type: 'OnNewGame',
  deps: ['UUID'],
  func: function OnNewGame (uuid) {
    return function seedGameInfo () {
      var secret = config.debug.develop ? 'public' : uuid().gen();

      return ['ensemble', { secret: secret }];
    };
  }
};