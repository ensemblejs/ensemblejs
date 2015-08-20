'use strict';

module.exports = {
  type: 'OnResume',
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