'use strict';

var reject = require('lodash').reject;
var select = require('lodash').select;
var each = require('lodash').each;
var map = require('lodash').map;
var includes = require('lodash').includes;

module.exports = {
  type: 'DelayedJobs',
  deps: ['DefinePlugin', 'DynamicPluginLoader', 'StateMutator'],
  func: function (definePlugin, dynamicPluginLoader, mutate) {
    var newJobs = [];
    var toCancel = [];

    function tick(jobs, dt) {
      return map(jobs, function (job) {
        if (job.duration === Infinity) {
          return job;
        }

        job.duration -= dt;
        return job;
      });
    }

    function ready (job) {
      return job.duration <= 0 && job.duration !== Infinity;
    }

    function cancelled (job) {
      return includes(toCancel, job.key);
    }

    definePlugin()('OnPhysicsFrame', function() {
      return function (state, dt) {
        var jobs = state.for('ensemble').get('jobs');
        var gameId = state.for('ensemble').get('gameId');

        jobs = jobs.concat(newJobs);
        jobs = reject(jobs, cancelled);
        jobs = tick(jobs, dt);

        var invoke = select(jobs, ready);
        each(invoke, function (job) {
          var callback = dynamicPluginLoader().get(job.plugin)[job.method];
          mutate()(gameId, callback(state));
        });

        newJobs = [];
        toCancel = [];

        return {
          ensemble: {
            jobs: reject(jobs, ready)
          }
        };
      };
    });

    function add (key, duration, plugin, method) {
      newJobs.push({
        key: key,
        duration: duration,
        plugin: plugin,
        method: method
      });
    }

    function cancelAll (key) {
      toCancel.push(key);
    }

    return {
      add: add,
      cancelAll: cancelAll
    };
  }
};