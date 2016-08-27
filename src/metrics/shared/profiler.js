'use strict';

import {filter, each, includes, startsWith} from 'lodash';
import define from '../../plugins/plug-n-play';
import {plugin} from '../../plugins/plug-n-play';
import {make as makeTimer} from '../../metrics/shared/timer';
import {execute} from 'royal-sampler';
import {on, logger} from '../../';

let timers = [];
let exact = [];
let wildcard = [
  'ensemblejs.',
  'Game.'
];

function shouldMeasureKey (key) {
  return includes(exact, key) ||
         filter(wildcard, t => startsWith(key, t)).length > 0;
}

function removeTimersNotConfigured () {
  let configuredTimers = plugin('Config').measure.timers;

  exact = filter(configuredTimers, t => !includes(t, '*'));
  wildcard = filter(configuredTimers, t => includes(t, '*')).map(t => t.replace('*', ''));

  timers = filter(timers, timerData => shouldMeasureKey(timerData.key));
}

export default function timer (namespace, type, name, frequency) {
  let t = makeTimer(namespace, type, name, frequency);

  if (shouldMeasureKey(t.key)) {
    timers.push(t);
  }

  return t;
}

define('Profiler', function Profiler () {
  return { timer };
});

on('ServerStart', function Profiler () {
  return removeTimersNotConfigured;
});

on('ClientStart', function Profiler () {
  return removeTimersNotConfigured;
});

// before('PhysicsFrame', function BeforePhysicsFrame () {
//   function printTimingResults () {
//     each(timers, function print (timingData) {
//       plugin('Metrics').profile(timingData.key, timingData.flush());
//     });
//   }

//   return execute(printTimingResults).every(5).seconds();
// });

on('Disconnect', ['Time'], function Profiler (time) {
  return function printTimingResults () {
    logger().info(`Timestamp of run: ${time().atStart()}`);

    each(timers, function print (timingData) {
      console.log(timingData.results(false, true));
      plugin('Metrics').profile(timingData.key, timingData.results(true));
    });
  };
});

on('ServerStop', ['Time'], function Profiler (time) {
  return function printTimingResults () {
    logger().info(`Timestamp of run: ${time().atStart()}`);

    each(timers, function print (timingData) {
      console.log(timingData.results(false, true));
      plugin('Metrics').profile(timingData.key, timingData.results(true));
    });
  };
});