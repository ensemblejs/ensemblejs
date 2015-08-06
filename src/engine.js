'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var select = require('lodash').filter;
var intersection = require('lodash').intersection;
var first = require('lodash').first;
var getFuncOf = require('lodash').last;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

module.exports = {
  type: 'ServerSideEngine',
  deps: ['OnPhysicsFrame', 'StateAccess', 'StateMutator', 'GamesList', 'Config'],
  func: function (onPhysicsFrame, state, mutator, games, config) {
    var priorStepTime = Date.now();

    var pausedGames = function(game) {
      return state().for(game.id).for('ensemble').get('paused');
    };

    var update = function(dt) {
      each(reject(games().all(), pausedGames), function(game) {
        var callbacksForGame = select(onPhysicsFrame(), function(callback) {
          return isApplicable(game.mode, callback);
        });

        var gameState = state().for(game.id);
        each(callbacksForGame, function(callback) {
          mutator()(game.id, getFuncOf(callback)(gameState, dt, game.id));
        });
      });
    };

    var step = function() {
      var now = Date.now();
      var dt = (now - priorStepTime) / 1000;

      update(dt);

      priorStepTime = now;
    };

    return {
      run: function() {
        step();
        return setInterval(step, config().server.physicsUpdateLoop);
      }
    };
  }
};