'use strict';

module.exports = {
  type: 'OnUnpause',
  func: function () {
    return function () {
      return {
        inch: {
          paused: false
        }
      };
    };
  }
};