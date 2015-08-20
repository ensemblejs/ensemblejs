'use strict';

module.exports = {
  type: 'StateSeed',
  func: function () {
    return {
      ensemble: {
        players: 0,
        observers: 0,
        paused: false,
        started: Date.now()
      }
    };
  }
};