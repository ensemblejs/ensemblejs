'use strict';

module.exports = {
  type: 'OnUnpause',
  func: function () {
    return function () {
      return {
        ensemble: {
          paused: false
        }
      };
    };
  }
};