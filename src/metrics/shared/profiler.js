'use strict';

import {select, each, includes, startsWith} from 'lodash';
import define from '../../plugins/plug-n-play';
import {plugin} from '../../plugins/plug-n-play';
import {make as makeTimer} from '../../metrics/shared/timer';

let timers = [];
let exact = [];
let wildcard = [
  'ensemblejs.',
  'Game.',
];

function shouldMeasureKey (key) {
  return includes(exact, key) ||
         select(wildcard, t => startsWith(key, t)).length > 0;
}

function removeTimersNotConfigured () {
  let configuredTimers = plugin('Config').measure.timers;

  exact = select(configuredTimers, t => !includes(t, '*'));
  wildcard = select(configuredTimers, t => includes(t, '*')).map(t => t.replace('*', ''));

  timers = select(timers, timerData => shouldMeasureKey(timerData.key));
}

export default function timer (namespace, type, name, frequency) {
  let t = makeTimer(namespace, type, name, frequency);

  if (shouldMeasureKey(t.key)) {
    timers.push(t);
  }

  return t;
}

define('Profiler', function Profiler () {
  return { timer: timer };
});

define('OnServerStart', function Profiler () {
  return removeTimersNotConfigured;
});

define('OnClientStart', function Profiler () {
  return removeTimersNotConfigured;
});

define('OnDisconnect', ['Time', 'Logger'], function Profiler (time, logger) {
  return function printTimingResults () {
    logger().info(`Timestamp of run: ${time().atStart()}`);

    each(timers, function print (timingData) {
      console.log(timingData.results(false, true));
      plugin('Metrics').profile(timingData.key, timingData.results(true));
    });
  };
});

define('OnServerStop', ['Time', 'Logger'], function Profiler (time, logger) {
  return function printTimingResults () {
    logger().info(`Timestamp of run: ${time().atStart()}`);

    each(timers, function print (timingData) {
      console.log(timingData.results(false, true));
      plugin('Metrics').profile(timingData.key, timingData.results(true));
    });
  };
});