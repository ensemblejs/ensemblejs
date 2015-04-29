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

    definePlugin()('ServerSideUpdate', function() {
      return function (dt) {
        each(effects, function (effect) {
          effect.tick(dt);
        });

        prune();
      };
    });

    return {
      add: function (key, duration, onComplete) {
        var wrapOnCompleteWithStateMutation = function () {
          stateMutator()(onComplete());
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