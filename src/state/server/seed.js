'use strict';

module.exports = {
  type: 'StateSeed',
  deps: ['Time'],
  func: function (time) {
    return {
      ensemble: {
        jobs: [],
        paused: false,
        started: time().present()
      }
    };
  }
};