'use strict';

var paused = require('../../util/state').paused;

module.exports = {
  deps: ['Window', 'On', 'CurrentState', 'CurrentServerState', 'DefinePlugin', 'Time'],
  type: 'PhysicsLoop',
  func: function PhysicsLoop (window, on, clientState, serverState, define, time) {
    var priorStep = time().present();

    define()('InternalState', function PhysicsLoop () {
      return {
        PhysicsLoop: {
          now: function () { return time().present(); }
        }
      };
    });

    return {
      run: function run () {
        if (clientState().get(paused) && serverState().get(paused)) {
          priorStep = time().present();
        } else {
          var now = time().present();
          var delta = (now - priorStep) / 1000;
          priorStep = now;

          on().physicsFrame('client', delta);
        }

        setTimeout(run, 15);
      }
    };
  }
};