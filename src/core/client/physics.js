'use strict';

const callEachPlugin = require('../../util/modes').callEachPlugin;
const callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
const callEachWithMutation = require('../../util/modes').callEachWithMutation;
const setFixedInterval = require('fixed-setinterval');

import define from '../../define';
import read from 'ok-selector';
import { createFixedTimeStep as createLoop } from 'game-loops';

module.exports = {
  type: 'OnClientReady',
  deps: [
    'CurrentState', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame',
    'StateMutator', 'StateAccess', 'SaveMode', 'Config', 'FrameStore', 'CollisionDetectionBridge'
  ],
  func: function PhysicsLoop (clientState, beforeFrame, onFrame, afterFrame, mutator, stateAccess, mode, config, frameStore, collisionDetection) {

    const save = { id: 'client', mode: mode() };
    const paused = (state) => read(state, 'ensemble.paused');
    const isPaused = () => clientState().get(paused) || !config().client.clientSidePrediction;
    const Δ = config().client.physicsUpdateLoop;

    function onEachFrame (frameΔ) {
      const state = stateAccess().for(save.id).all();
      const opts = [frameΔ, state];

      callEachWithMutation(beforeFrame(), mutator, save.id, opts);

      if (!read(state, 'ensemble.waitingForPlayers')) {
        callForModeWithMutation(onFrame(), mutator, save, opts);
        mutator()(save.id, collisionDetection().detectCollisions(...opts));
      }
    }

    const runLoop = createLoop(Δ, isPaused, (frameΔ) => frameStore().process(frameΔ, onEachFrame));
    const onInterval = () => {
      runLoop();
      callEachPlugin(afterFrame());
    };

    const ids = [];
    define('OnDisconnect', function OnDisconnect () {
      return function stopPhysicsLoop () {
        ids.forEach((cancel) => cancel());

        frameStore().reset();

        ids.splice(0);
      };
    });

    return function run () {
      onInterval();
      ids.push(setFixedInterval(onInterval, Δ));
    };
  }
};