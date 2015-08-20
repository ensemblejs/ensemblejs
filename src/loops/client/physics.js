'use strict';

var present = require('present');

module.exports = {
  deps: ['Window', 'On', 'CurrentState', 'CurrentServerState'],
  type: 'PhysicsLoop',
  func: function PhysicsLoop (window, on, clientState, serverState) {
    var priorStep = present();

    function paused (state) { return state.ensemble.paused; }

    return {
      run: function run () {
        if (clientState().get(paused) && serverState().get(paused)) {
          priorStep = present();
        } else {
          var now = present();
          var delta = (now - priorStep) / 1000;
          priorStep = present();

          on().physicsFrame('ignored-on-client', delta);
        }

        setTimeout(run, 15);
      }
    };
  }
};