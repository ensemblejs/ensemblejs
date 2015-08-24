'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var select = require('lodash').filter;
var getFuncOf = require('lodash').last;
var isApplicable = require('../../util/modes').isApplicable;

module.exports = {
  type: 'ServerSideEngine',
  deps: ['OnPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config', 'DefinePlugin', 'Time'],
  func: function (onPhysicsFrame, state, mutator, games, config, define, time) {
    var priorStepTime = time().present();

    var pausedGames = function(game) {
      return state().for(game.id).for('ensemble').get('paused');
    };

    var update = function(delta) {
      var running = reject(games().all(), pausedGames);

      each(running, function(game) {
        var callbacks = select(onPhysicsFrame(), function(callback) {
          return isApplicable(game.mode, callback);
        });

        //TODO: replace with event-router
        // on().physicsFrame(game.id, delta);
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

    return {
      run: function() {
        step();
        return setInterval(step, config().server.physicsUpdateLoop);
      }
    };
  }
};