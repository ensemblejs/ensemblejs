  'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var select = require('lodash').filter;
var getFuncOf = require('lodash').last;
var filterByMode = require('../../util/modes').filterByMode;

module.exports = {
  type: 'OnStart',
  deps: ['OnPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config', 'DefinePlugin', 'Time'],
  func: function (onPhysicsFrame, state, mutator, games, config, define, time) {
    var priorStepTime = time().present();

    var pausedGames = function(game) {
      return state().for(game.id).for('ensemble').get('paused');
    };

    var update = function(delta) {
      var running = reject(games().all(), pausedGames);

      each(running, function(game) {
        var callbacks = filterByMode(onPhysicsFrame, game.mode);

        var gameState = state().for(game.id);
        each(callbacks, function(callback) {
          mutator()(game.id, getFuncOf(callback)(gameState, delta, game.id));
        });
      });
    };

    var step = function() {
      var now = time().present();
      var dt = (now - priorStepTime) / 1000;

      update(dt);

      priorStepTime = now;
    };

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