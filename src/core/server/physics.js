'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var config = require('../../util/config');
const setFixedInterval = require('fixed-setinterval');

module.exports = {
  type: 'OnServerStart',
  deps: ['BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateAccess', 'StateMutator', 'SavesList', 'DefinePlugin', 'Time'],
  func: function ServerPhysicsEngine (beforeFrame, onFrame, afterFrame, stateAccess, mutator, saves, define, time) {

    let priorStepTime = time().present();
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

        if (!state.ensemble.waitingForPlayers) {
          callForModeWithMutation(onFrame(), mutator, save, opts);
        }

        callEachWithMutation(afterFrame(), mutator, save.id, opts);
      });
    }

    function step () {
      const now = time().present();
      const Δ = (now - priorStepTime) / 1000;

      update(Δ);

      priorStepTime = now;
    }

    define()('OnServerStop', () => {
      return function stopEngine () {
        each(ids, cancel => cancel());
        ids = [];
      };
    });

    define()('InternalState', () => {
      return {
        ServerSideEngine: {
          now: function () { return time().present(); }
        }
      };
    });

    return function run () {
      step();
      ids.push(setFixedInterval(step, config.get().server.physicsUpdateLoop));
    };
  }
};