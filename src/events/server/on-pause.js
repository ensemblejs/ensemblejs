'use strict';

module.exports = {
  type: 'OnPause',
  func: function OnPause () {
    return function pauseSave () {
      return ['ensemble.paused', true];
    };
  }
};