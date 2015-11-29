'use strict';

module.exports = {
  type: 'OnPause',
  func: function OnPause () {
    return function pauseGame () {
      return ['ensemble.paused', true];
    };
  }
};