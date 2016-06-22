'use strict';

var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var setFixedInterval = require('fixed-setinterval');

import define from '../../define';

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'Time', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateMutator', 'StateAccess', 'SaveMode', 'Config', 'FrameStore'],
  func: function PhysicsLoop (clientState, serverState, time, beforeFrame, onFrame, afterFrame, mutator, state, mode, config, frameStore) {

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

      if (delta > 1) {
        delta = 0;
      }

      frameStore().process(delta, function onEachFrame (frameDelta) {
        var saveState = state().for(save.id);
        const opts = [frameDelta, saveState];

        callEachWithMutation(beforeFrame(), mutator, save.id, opts);

        if (!saveState.get('ensemble.waitingForPlayers')) {
          callForModeWithMutation(onFrame(), mutator, save, opts);
        }
      });
    }

    function paused (s) {
      return s.ensemble.paused;
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
    define('OnDisconnect', function OnDisconnect () {
      return function stopPhysicsLoop () {
        ids.forEach(cancel => cancel());

        frameStore().reset();

        ids = [];
      };
    });

    define('InternalState', function InternalState () {
      return {
        PhysicsLoop: {
          now: () => time().present()
        }
      };
    });

    return function run () {
      step();
      ids.push(setFixedInterval(step, config().client.physicsUpdateLoop));
    };
  }
};