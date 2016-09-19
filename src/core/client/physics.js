'use strict';

const callEachPlugin = require('../../util/modes').callEachPlugin;
const callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
const callEachWithMutation = require('../../util/modes').callEachWithMutation;
const setFixedInterval = require('fixed-setinterval');

import define from '../../define';
import read from 'ok-selector';

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'Time', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateMutator', 'StateAccess', 'SaveMode', 'Config', 'FrameStore'],
  func: function PhysicsLoop (clientState, serverState, time, beforeFrame, onFrame, afterFrame, mutator, stateAccess, mode, config, frameStore) {

    let t0 = time().precise();

    const save = { id: 'client', mode: mode() };
    const paused = (state) => read(state, 'ensemble.paused');

    function doPaused(t1) {
      t0 = t1;
    }

    let state;
    let opts;
    function onEachFrame (Δ) {
      state = stateAccess().for(save.id).all();
      opts = [Δ, state];

      callEachWithMutation(beforeFrame(), mutator, save.id, opts);

      if (!read(state, 'ensemble.waitingForPlayers')) {
        callForModeWithMutation(onFrame(), mutator, save, opts);
      }
    }

    let accumulator = 0;
    function doRunning (t1) {
      const frameLength = config().client.physicsUpdateLoop;

      accumulator += (t1 - t0);
      t0 = t1;

      while(accumulator >= frameLength) {
        frameStore().process(frameLength, onEachFrame);
        accumulator -= frameLength;
      }
    }

    function shouldRunPhysicsEngine () {
      return (
        !clientState().get(paused) &&
        !serverState().get(paused) &&
        config().client.clientSidePrediction
      );
    }

    function step() {
      const t1 = time().precise();

      if (shouldRunPhysicsEngine()) {
        doRunning(t1);
      } else {
        doPaused(t1);
      }

      callEachPlugin(afterFrame());
    }

    let ids = [];
    define('OnDisconnect', function OnDisconnect () {
      return function stopPhysicsLoop () {
        ids.forEach((cancel) => cancel());

        frameStore().reset();

        ids = [];
      };
    });

    return function run () {
      step();
      ids.push(setFixedInterval(step, config().client.physicsUpdateLoop));
    };
  }
};