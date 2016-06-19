'use strict';

module.exports = {
  type: 'StateSeed',
  deps: ['Time'],
  func: function (time) {
    return {
      ensemble: {
        jobs: [],
        paused: false,
        waitingForPlayers: true,
        started: time().present(),
        worldTime: 0
      },
      players: []
    };
  }
};