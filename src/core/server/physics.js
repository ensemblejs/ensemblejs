'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var config = require('../../util/config');
const setFixedInterval = require('fixed-setinterval');
import read from 'ok-selector';

module.exports = {
  type: 'OnServerStart',
  deps: ['BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateAccess', 'StateMutator', 'SavesList', 'DefinePlugin', 'Time'],
  func: function ServerPhysicsEngine (beforeFrame, onFrame, afterFrame, stateAccess, mutator, saves, define, time) {

    let t0 = time().precise();
    let ids = [];

    function pausedSaves (save) {
      return stateAccess().for(save.id).get('ensemble.paused');
    }

    function update (Δ) {
      const running = reject(saves().loaded(), pausedSaves);
      each(running, function callUpdateOnEach (save) {
        const state = stateAccess().for(save.id).all();
        const opts = [Δ, state];

        callEachWithMutation(beforeFrame(), mutator, save.id, opts);

        if (!read(state, 'ensemble.waitingForPlayers')) {
          callForModeWithMutation(onFrame(), mutator, save, opts);
        }

        callEachWithMutation(afterFrame(), mutator, save.id, opts);
      });
    }

    let accumulator = 0;
    function step () {
      const t1 = time().precise();
      const frameLength = config.get().server.physicsUpdateLoop;

      accumulator += (t1 - t0);
      t0 = t1;

      while(accumulator >= frameLength) {
        update(frameLength);
        accumulator -= frameLength;
      }
    }

    define()('OnServerStop', () => {
      return function stopEngine () {
        each(ids, (cancel) => cancel());
        ids = [];
      };
    });

    define()('InternalState', () => {
      return {
        ServerSideEngine: {
          now: () =>time().present()
        }
      };
    });

    return function run () {
      step();
      ids.push(setFixedInterval(step, config.get().server.physicsUpdateLoop));
    };
  }
};