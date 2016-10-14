'use strict';

const callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
const callEachWithMutation = require('../../util/modes').callEachWithMutation;
const config = require('../../util/config');
const { on } = require('../../events');
const setFixedInterval = require('fixed-setinterval');
import read from 'ok-selector';
import { createFixedTimeStep as createLoop } from 'game-loops';

const ids = [];

module.exports = {
  type: 'OnServerStart',
  deps: [
    'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame',
    'StateAccess', 'StateMutator', 'SavesList', 'CollisionDetectionBridge'
  ],
  func: (beforeFrame, onFrame, afterFrame, stateAccess, mutator, saves, collisionDetection) => {
    const runningSaves = (save) => !stateAccess().for(save.id).get('ensemble.paused');
    const Δ = config.get().server.physicsUpdateLoop;
    const maxFrameStep = config.get().server.physicsMaxFrameDelta;

    function runEachSave (frameΔ) {
      const run = (save) => {
        const state = stateAccess().for(save.id).all();
        const opts = [frameΔ, state];

        callEachWithMutation(beforeFrame(), mutator, save.id, opts);

        if (!read(state, 'ensemble.waitingForPlayers')) {
          callForModeWithMutation(onFrame(), mutator, save, opts);
          mutator()(save.id, collisionDetection().detectCollisions(...opts));
        }

        callEachWithMutation(afterFrame(), mutator, save.id, opts);
      }

      saves().loaded().filter(runningSaves).forEach(run);
    }

    const thisPartNeverPaused = () => false;
    const runLoop = createLoop(Δ, thisPartNeverPaused, runEachSave, maxFrameStep);

    on('ServerStop', () => {
      return function stopEngine () {
        ids.forEach((cancel) => cancel());
        ids.splice(0);
      };
    });

    return function run () {
      runLoop();
      ids.push(setFixedInterval(runLoop, config.get().server.physicsUpdateLoop));
    };
  }
};