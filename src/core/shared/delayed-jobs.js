'use strict';

import {reject, filter, each, map, includes, isEmpty} from 'lodash';

module.exports = {
  type: 'DelayedJobs',
  deps: ['DefinePlugin', 'StateMutator', 'Logger', 'DynamicPluginLoader'],
  func: function (define, mutate, logger, dynamicPluginLoader) {
    var newJobs = [];
    var toCancel = [];
    var jobNames = [];

    function tick(jobs, Δ) {
      return map(jobs, function subtractDeltaFromDuration (job) {
        if (job.duration === Infinity) {
          return job;
        }

        job.duration -= Δ;
        return job;
      });
    }

    function ready (job) {
      return job.duration <= 0 && job.duration !== Infinity;
    }

    function cancelled (job) {
      return includes(toCancel, job.key);
    }

    function devuxAddKeyToList (key) {
      if (includes(jobNames, key)) {
        return;
      }

      jobNames.push(key);
    }

    function devuxCheckJobName (job) {
      if (includes(jobNames, job.key)) {
        return;
      }

      logger().warn({job}, "Can't cancel job as it has never been added. Are you sure the job name is spelt correctly?");
    }

    define()('OnPhysicsFrame', function DelayedJobs () {
      return function tickActiveJobs (Δ, state) {
        var jobs = state.ensemble.jobs;
        var saveId = state.ensemble.saveId;

        function callOnCompleteHandlerForReadyJobs (job) {
          logger().info(job, 'Job Ready');

          let callback = dynamicPluginLoader().get(job.plugin)[job.method];
          mutate()(saveId, callback(state));
        }

        jobs = jobs.concat(newJobs);
        each(filter(jobs, cancelled), devuxCheckJobName);
        jobs = reject(jobs, cancelled);
        jobs = tick(jobs, Δ);

        each(filter(jobs, ready), callOnCompleteHandlerForReadyJobs);

        newJobs = [];
        toCancel = [];

        let jobsToSave = reject(jobs, ready);
        if (isEmpty(state.ensemble.jobs) && isEmpty(jobsToSave)) {
          return undefined;
        }

        return ['ensemble.jobs', jobsToSave];
      };
    });

    function add (key, duration, plugin, method) {
      newJobs.push({ key, duration, plugin, method });
      devuxAddKeyToList(key);
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