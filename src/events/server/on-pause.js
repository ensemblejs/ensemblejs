'use strict';

module.exports = {
  type: 'OnPause',
  func: function () {
    return function () {
      return {
        ensemble: {
          paused: true
        }
      };
    };
  }
};