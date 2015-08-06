'use strict';

var reject = require('lodash').reject;
var each = require('lodash').each;
var delayedEffect = require('./delayed_job');

module.exports = {
  type: 'DelayedJobs',
  deps: ['DefinePlugin', 'StateMutator'],
  func: function (definePlugin, stateMutator) {
    var effects = [];

    var prune = function () {
      return reject(effects, function (t) {
        return !t.isAlive();
      });
    };

    definePlugin()('OnPhysicsFrame', function() {
      return function (state, dt, gameId) {
        each(effects, function (effect) {
          effect.tick(state, dt, gameId);
        });

        prune();
      };
    });

    return {
      add: function (key, duration, onComplete) {
        var wrapOnCompleteWithStateMutation = function (state, gameId) {
          stateMutator()(gameId, onComplete(state));
        };

        effects.push(Object.create(delayedEffect(key, duration, wrapOnCompleteWithStateMutation)));
      },
      cancelAll: function (key) {
        each(effects, function (effect) {
          if (effect.key === key || key === undefined) {
            effect.cancel();
          }
        });
      }
    };
  }
};