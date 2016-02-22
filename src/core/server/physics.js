'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var config = require('../../util/config');

module.exports = {
  type: 'OnServerStart',
  deps: ['BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateAccess', 'StateMutator', 'SavesList', 'DefinePlugin', 'Time', 'Profiler'],
  func: function ServerPhysicsEngine (beforeFrame, onFrame, afterFrame, state, mutator, saves, define, time, profiler) {
    var rate = profiler().timer('ensemblejs', 'server-physics', 'call-rate', 1);
    var priorStepTime = time().present();
    var ids = [];

    function pausedSaves (save) {
      return state().for(save.id).get('ensemble.paused');
    }

    function update (delta) {
      var running = reject(saves().loaded(), pausedSaves);
      each(running, function callUpdateOnEach (save) {
        var saveState = state().for(save.id);
        var opts = [delta, saveState];

        callEachWithMutation(beforeFrame(), mutator, save.id, opts);

        if (saveState.get('ensemble.waitingForPlayers')) {
          return;
        }

        callForModeWithMutation(onFrame(), mutator, save, opts);
        callEachWithMutation(afterFrame(), mutator, save.id, opts);
      });
    }

    function step () {
      rate.fromHere();

      var now = time().present();
      var dt = (now - priorStepTime) / 1000;

      update(dt);

      priorStepTime = now;

      rate.toHere();
    }

    define()('OnServerStop', function ServerPhysicsEngine () {
      return function stopEngine () {
        each(ids, clearInterval);
        ids = [];
      };
    });

    define()('InternalState', function ServerPhysicsEngine () {
      return {
        ServerSideEngine: {
          now: function () { return time().present(); },
          callRate: function callRate () { return rate.results().rate; }
        }
      };
    });

    return function run () {
      step();
      ids.push(setInterval(step, config.get().server.physicsUpdateLoop));
    };
  }
};