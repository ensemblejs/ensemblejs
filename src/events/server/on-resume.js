'use strict';

module.exports = {
  type: 'OnResume',
  func: function OnResume () {
    return function unpauseGame () {
      return {
        ensemble: {
          paused: false
        }
      };
    };
  }
};