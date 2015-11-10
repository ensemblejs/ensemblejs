'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;

module.exports = {
  type: 'OnServerStart',
  deps: ['BeforePhysicsFrame', 'OnPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config', 'DefinePlugin', 'Time', 'Profiler'],
  func: function ServerPhysicsEngine (beforeFrame, onFrame, state, mutator, games, config, define, time, profiler) {
    var rate = profiler().timer('ensemblejs', 'server-physics', 'call-rate', 1);
    var priorStepTime = time().present();
    var interval;

    function pausedGames (game) {
      return state().for(game.id).get('ensemble.paused');
    }

    function update (delta) {
      var running = reject(games().all(), pausedGames);

      each(running, function callUpdateOnEach (game) {
        var gameState = state().for(game.id);
        var opts = [gameState, delta];

        callEachWithMutation(beforeFrame(), mutator, game.id, opts);

        if (gameState.get('ensemble.waitingForPlayers')) {
          return;
        }

        callForModeWithMutation(onFrame(), mutator, game, opts);
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
        if (!interval) {
          return;
        }

        clearInterval(interval);
        interval = null;
      };
    });

    define()('InternalState', function ServerPhysicsEngine () {
      return {
        ServerSideEngine: {
          now: function () { return time().present(); },
          callRate: function callRate () { return rate.results(); }
        }
      };
    });

    return function run () {
      step();
      interval = setInterval(step, config().server.physicsUpdateLoop);
    };
  }
};