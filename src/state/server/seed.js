'use strict';

module.exports = {
  type: 'StateSeed',
  deps: ['Time'],
  func: function (time) {
    return {
      ensemble: {
        players: 0,
        observers: 0,
        paused: false,
        started: time().present()
      }
    };
  }
};