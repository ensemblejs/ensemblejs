'use strict';

import {sortBy, first, last, map, reduce} from 'lodash';
import {plugin, boilerplate} from '../../plugins/plug-n-play';

function getPercentile (percentile, values) {
  if (values.length === 0) {
    return 0;
  }

  let i = (percentile/100) * values.length;

  if (Math.floor(i) === i) {
    return (values[i-1] + values[i])/2;
  } else {
    return values[Math.floor(i)];
  }
}

function calculateRate (samples, veryFirstTime, now, frequency) {
  if (samples.length === 0) {
    return 0;
  }

  let totalElapsed = (now - veryFirstTime) / 1000;
  if (totalElapsed <= 0) {
    return 0;
  }

  return (samples.length / totalElapsed) * frequency;
}

let config = plugin('Config');

export function make (namespace, type, name, frequency = config.measure.frequency) {
  let samples = [];
  let totalDuration = 0;
  let counter = 0;
  let startTime;
  let veryFirstTime;
  let veryLastTime;
  let time = plugin('Time');

  function start () {
    startTime = time.present();

    veryFirstTime = veryFirstTime || startTime;
  }

  function add (duration) {
    if (counter === frequency) {
      samples.push(duration);
      totalDuration += duration;
      counter = 0;
    }
    counter += 1;

    veryFirstTime = veryFirstTime || time.present();
    veryLastTime = time.present();
  }

  function stop () {
    let duration = time.present() - startTime;

    add(duration);
  }

  function results (includeSamples = false, calculate = false) {
    let theNumbers = {
      key: `${namespace}.${type}.${name}`,
      frequency: frequency,
      samples: samples.length,
      raw: includeSamples ? samples : undefined,
      veryFirstTime: veryFirstTime,
      veryLastTime: veryLastTime,
      rate: calculateRate(samples, veryFirstTime, time.present(), frequency),
      appRuntime: time.sinceStart(),
    };

    function sum (set) {
      return reduce(set, (sum, n) => sum + n, 0);
    }

    function average (set) {
      return sum(set) / set.length;
    }

    function squareDiff (set) {
      let avg = average(set);

      return map(set, function (value) {
        let diff = value - avg;
        return diff * diff;
      });
    }

    function stddev (set) {
      return Math.sqrt(average(squareDiff(set)));
    }

    if (calculate) {
      let sortedSamples = sortBy(samples);

      theNumbers.min = first(sortedSamples);
      theNumbers.max = last(sortedSamples);
      theNumbers['50th'] = getPercentile(0.5, sortedSamples);
      theNumbers['75th'] = getPercentile(0.75, sortedSamples);
      theNumbers['95th'] = getPercentile(0.95, sortedSamples);
      theNumbers['99th'] = getPercentile(0.99, sortedSamples);
      theNumbers.average = average(samples);
      theNumbers.total = sum(samples);
      theNumbers.percentOfRuntime = sum(samples) / theNumbers.appRuntime;
      theNumbers.standardDeviation = stddev(samples);
    }

    return theNumbers;
  }

  function track (f, args = []) {
    start();
    f(...args);
    stop();
  }

  const timerObject = {
    key: `${namespace}.${type}.${name}`,
    fromHere: start,
    toHere: stop,
    manual: add,
    results: results,
    samples: samples,
    track: track
  };

  return timerObject;
}

export default boilerplate('Timer', function Timer () {
  return {
    make: make
  };
});