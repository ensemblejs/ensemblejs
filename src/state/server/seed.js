'use strict';

module.exports = {
  type: 'StateSeed',
  deps: ['Time'],
  func: function (time) {
    return {
      ensemble: {
        jobs: [],
        paused: false,
        randomSeed: 0,
        started: time().present()
      }
    };
  }
};