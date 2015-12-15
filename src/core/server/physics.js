'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;

module.exports = {
  type: 'OnServerStart',
  deps: ['BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config', 'DefinePlugin', 'Time', 'Profiler'],
  func: function ServerPhysicsEngine (beforeFrame, onFrame, afterFrame, state, mutator, games, config, define, time, profiler) {
    var rate = profiler().timer('ensemblejs', 'server-physics', 'call-rate', 1);
    var priorStepTime = time().present();
    var ids = [];

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
        callEachWithMutation(afterFrame(), mutator, game, opts);
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
        each(ids, function (id) {
          clearInterval(id);
        });
        ids = [];
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
      ids.push(setInterval(step, config().server.physicsUpdateLoop));
    };
  }
};