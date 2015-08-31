  'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;

module.exports = {
  type: 'OnStart',
  deps: ['OnPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config', 'DefinePlugin', 'Time'],
  func: function OnStart (onPhysicsFrame, state, mutator, games, config, define, time) {

    var priorStepTime = time().present();

    function pausedGames (game) {
      return state().for(game.id).for('ensemble').get('paused');
    }

    function update (delta) {
      var running = reject(games().all(), pausedGames);

      each(running, function callUpdateOnEach (game) {
        var gameState = state().for(game.id);

        callForModeWithMutation(
          onPhysicsFrame(),
          mutator,
          game,
          [gameState, delta]
        );
      });
    }

    function step () {
      var now = time().present();
      var dt = (now - priorStepTime) / 1000;

      update(dt);

      priorStepTime = now;
    }

    define()('InternalState', function ServerSideEngine () {
      return {
        ServerSideEngine: {
          now: function () { return time().present(); }
        }
      };
    });

    return function run () {
      step();
      setInterval(step, config().server.physicsUpdateLoop);
    };
  }
};