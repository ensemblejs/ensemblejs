'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;

module.exports = {
  type: 'OnServerStart',
  deps: ['BeginPhysicsFrame', 'OnPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config', 'DefinePlugin', 'Time'],
  func: function ServerPhysicsEngine (beginFrame, onFrame, state, mutator, games, config, define, time) {

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

        callEachWithMutation(
          beginFrame(),
          mutator,
          game,
          opts
        );

        if (!state().for(game.id).get('ensemble.waitingForPlayers')) {
          callForModeWithMutation(
            onFrame(),
            mutator,
            game,
            opts
          );
        }
      });
    }

    function step () {
      var now = time().present();
      var dt = (now - priorStepTime) / 1000;

      update(dt);

      priorStepTime = now;
    }

    define()('OnServerStop', function ServerPhysicsEngine () {
      return function stopEngine () {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };
    });

    define()('InternalState', function ServerPhysicsEngine () {
      return {
        ServerSideEngine: {
          now: function () { return time().present(); }
        }
      };
    });

    return function run () {
      step();
      interval = setInterval(step, config().server.physicsUpdateLoop);
    };
  }
};