'use strict';

var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;

import define from '../../define';

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'Time', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateMutator', 'StateAccess', 'SaveMode', 'Config'],
  func: function PhysicsLoop (clientState, serverState, time, beforeFrame, onFrame, afterFrame, mutator, state, mode, config) {

    var priorStep = time().present();

    var save = {
      id: 'client',
      mode: mode()
    };

    function doPaused(now) {
      priorStep = now;
    }

    function doRunning (now) {
      var delta = (now - priorStep) / 1000;
      priorStep = now;

      var saveState = state().for(save.id);
      var opts = [delta, saveState];

      callEachWithMutation(beforeFrame(), mutator, save.id, opts);

      if (!saveState.get('ensemble.waitingForPlayers')) {
        callForModeWithMutation(onFrame(), mutator, save, opts);
      }
    }

    function paused (state) {
      return state.ensemble.paused;
    }

    function shouldRunPhysicsEngine () {
      return (
        !clientState().get(paused) &&
        !serverState().get(paused) &&
        config().client.clientSidePrediction
      );
    }

    function step() {
      var now = time().present();

      if (shouldRunPhysicsEngine()) {
        doRunning(now);
      } else {
        doPaused(now);
      }

      callEachPlugin(afterFrame());
    }

    var ids = [];
    define('OnDisconnect', function PhysicsLoop () {
      return function stopPhysicsLoop () {
        for (let i = 0; i < ids.length; i += 1) {
          clearInterval(ids[i]);
        }

        ids = [];
      };
    });

    return function run () {
      step();
      ids.push(setInterval(step, config().client.physicsUpdateLoop));
    };
  }
};