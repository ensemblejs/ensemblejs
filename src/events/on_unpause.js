'use strict';

module.exports = {
  type: 'OnUnpause',
  deps: ['NewState'],
  func: function (newState) {
    return ['*', function () {
      return newState().create('ensemble', {paused: false});
    }];
  }
};