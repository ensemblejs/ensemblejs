'use strict';

import reject from 'lodash/reject';
import includes from 'lodash/includes';
import isEmpty from 'lodash/isEmpty';
import { join } from '../../util/array';
import read from 'ok-selector';
import { logger } from '../../';

module.exports = {
  type: 'DelayedJobs',
  deps: ['DefinePlugin', 'StateMutator', 'DynamicPluginLoader'],
  func: function (define, mutate, dynamicPluginLoader) {
    const newJobs = [];
    const toCancel = [];
    const jobNames = [];

    function tick(jobs, Δ) {
      return jobs.map(function subtractDeltaFromDuration (job) {
        if (job.duration === Infinity) {
          return job;
        }

        job.duration -= Δ;
        return job;
      });
    }

    const ready = (job) => job.duration <= 0 && job.duration !== Infinity;
    const cancelled = (job) => includes(toCancel, job.key);

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
        let jobs = read(state, 'ensemble.jobs');
        const saveId = read(state, 'ensemble.saveId');

        function callOnCompleteHandlerForReadyJobs (job) {
          logger().info(job, 'Job Ready');

          const callback = dynamicPluginLoader().get(job.plugin)[job.method];
          mutate()(saveId, callback(state));
        }

        join(jobs, newJobs.splice(0));
        jobs.filter(cancelled).forEach(devuxCheckJobName);
        jobs = reject(jobs, cancelled);
        jobs = tick(jobs, Δ);

        jobs.filter(ready).forEach(callOnCompleteHandlerForReadyJobs);

        toCancel.splice(0);

        const jobsToSave = reject(jobs, ready);
        if (isEmpty(read(state, 'ensemble.jobs')) && isEmpty(jobsToSave)) {
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

    return { add, cancelAll };
  }
};