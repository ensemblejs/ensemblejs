'use strict';

module.exports = {
  type: 'OnPause',
  deps: ['NewState'],
  func: function (newState) {
    return ['*', function () {
      return newState().create('ensemble', {paused: true});
    }];
  }
};