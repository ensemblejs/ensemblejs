'use strict';

var sortBy = require('lodash').sortBy;
var first = require('lodash').first;
var last = require('lodash').last;
var map = require('lodash').map;
var reduce = require('lodash').reduce;

function getPercentile (percentile, values) {
  if (values.length === 0) {
    return 0;
  }

  var i = (percentile/100) * values.length;

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

  var totalElapsed = (now - veryFirstTime) / 1000;
  if (totalElapsed <= 0) {
    return 0;
  }

  return (samples.length / totalElapsed) * frequency;
}

module.exports = {
  type: 'Timer',
  deps: ['Time', 'Config'],
  func: function Timer (time, config) {

    function make (namespace, plugin, name, frequency = config().measure.frequency) {
      var samples = [];
      var totalDuration = 0;
      var counter = 0;
      var startTime;
      var veryFirstTime;
      var veryLastTime;

      function start () {
        startTime = time().present();

        veryFirstTime = veryFirstTime || startTime;
      }

      function add (duration) {
        if (counter === frequency) {
          samples.push(duration);
          totalDuration += duration;
          counter = 0;
        }
        counter += 1;

        veryFirstTime = veryFirstTime || time().present();
        veryLastTime = time().present();
      }

      function stop () {
        var duration = time().present() - startTime;

        add(duration);
      }

      function results (includeSamples = false, calculate = false) {
        var theNumbers = {
          key: `${namespace}.${plugin}.${name}`,
          frequency: frequency,
          samples: samples.length,
          raw: includeSamples ? samples : undefined,
          veryFirstTime: veryFirstTime,
          veryLastTime: veryLastTime,
          rate: calculateRate(samples, veryFirstTime, time().present(), frequency),
          appRuntime: time().sinceStart(),
        };

        function sum (set) {
          return reduce(set, (sum, n) => sum + n, 0);
        }

        function average (set) {
          return sum(set) / set.length;
        }

        function squareDiff (set) {
          var avg = average(set);

          return map(set, function (value) {
            var diff = value - avg;
            return diff * diff;
          });
        }

        function stddev (set) {
          return Math.sqrt(average(squareDiff(set)));
        }

        if (calculate) {
          var sortedSamples = sortBy(samples);

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

      function track (f, args) {
        args = args || [];

        start();
        f.apply(undefined, args);
        stop();
      }

      var timerObject = {
        key: `${namespace}.${plugin}.${name}`,
        fromHere: start,
        toHere: stop,
        manual: add,
        results: results,
        track: track
      };

      return timerObject;
    }

    return {
      make: make
    };
  }
};