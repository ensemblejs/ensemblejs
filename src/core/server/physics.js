'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var config = require('../../util/config');
const setFixedInterval = require('fixed-setinterval');

module.exports = {
  type: 'OnServerStart',
  deps: ['BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateAccess', 'StateMutator', 'SavesList', 'DefinePlugin', 'Time', 'Profiler'],
  func: function ServerPhysicsEngine (beforeFrame, onFrame, afterFrame, stateAccess, mutator, saves, define, time, profiler) {
    var rate = profiler().timer('ensemblejs', 'server-physics', 'call-rate', 1);
    var priorStepTime = time().present();
    var ids = [];

    function pausedSaves (save) {
      return stateAccess().for(save.id).get('ensemble.paused');
    }

    function update (delta) {
      var running = reject(saves().loaded(), pausedSaves);
      each(running, function callUpdateOnEach (save) {
        var state = stateAccess().for(save.id).all();
        var opts = [delta, state];

        callEachWithMutation(beforeFrame(), mutator, save.id, opts);

        if (state.ensemble.waitingForPlayers) {
          return;
        }

        callForModeWithMutation(onFrame(), mutator, save, opts);
        callEachWithMutation(afterFrame(), mutator, save.id, opts);
      });
    }

    function step () {
      rate.fromHere();

      var now = time().present();
      var delta = (now - priorStepTime) / 1000;

      update(delta);

      priorStepTime = now;

      rate.toHere();
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
          now: function () { return time().present(); },
          callRate: function callRate () { return rate.results().rate; }
        }
      };
    });

    return function run () {
      step();
      ids.push(setFixedInterval(step, config.get().server.physicsUpdateLoop));
    };
  }
};