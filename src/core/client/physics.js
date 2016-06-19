'use strict';

var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var setFixedInterval = require('fixed-setinterval');

import define from '../../define';

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'Time', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateMutator', 'StateAccess', 'SaveMode', 'Config', 'FrameStore'],
  func: function PhysicsLoop (clientState, serverState, time, beforeFrame, onFrame, afterFrame, mutator, stateAccess, mode, config, frameStore) {

    let priorStep = time().present();

    const save = { id: 'client', mode: mode() };
    const paused = state => state.ensemble.paused;

    function doPaused(now) {
      priorStep = now;
    }

    function doRunning (now) {
      let delta = (now - priorStep) / 1000;
      priorStep = now;

      if (delta > 1) {
        delta = 0;
      }

      frameStore().process(delta, function onEachFrame (frameDelta) {
        const state = stateAccess().for(save.id).all();
        const opts = [frameDelta, state];

        callEachWithMutation(beforeFrame(), mutator, save.id, opts);

        if (!state.ensemble.waitingForPlayers) {
          callForModeWithMutation(onFrame(), mutator, save, opts);
        }
      });
    }

    function shouldRunPhysicsEngine () {
      return (
        !clientState().get(paused) &&
        !serverState().get(paused) &&
        config().client.clientSidePrediction
      );
    }

    function step() {
      const now = time().present();

      if (shouldRunPhysicsEngine()) {
        doRunning(now);
      } else {
        doPaused(now);
      }

      callEachPlugin(afterFrame());
    }

    let ids = [];
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