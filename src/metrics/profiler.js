'use strict';

var present = require('present');
var sortBy = require('lodash').sortBy;
var first = require('lodash').first;
var last = require('lodash').last;
var select = require('lodash').select;
var each = require('lodash').each;
var includes = require('lodash').includes;
var startsWith = require('lodash').startsWith;

module.exports = {
  type: 'Profiler',
  deps: ['DefinePlugin', 'Config'],
  func: function Profiler (define, config) {
    var timers = {};

    function removeTimersNotConfigured () {
      var configuredTimers = config().measure.timers;
      var exact = select(configuredTimers, function(timer) {
        return !includes(timer, '*');
      });
      var wildcard = select(configuredTimers, function(timer) {
        return includes(timer, '*');
      }).map(function(timer) {
        return timer.replace('*', '');
      });

      var exactTimers = select(timers, function(timerData, key) {
        return includes(exact, key);
      });

      var wildcardTimers = select(timers, function(timerData, key) {
        return select(wildcard, function(timer) {
          return startsWith(key, timer);
        }).length > 0;
      });

      timers = exactTimers.concat(wildcardTimers);
    }

    function getPercentile(percentile, values) {
      var i = (percentile/100) * values.length;

      if (Math.floor(i) === i) {
        return (values[i-1] + values[i])/2;
      } else {
        return values[Math.floor(i)];
      }
    }

    function timer (namespace, plugin, name, frequency) {
      var samples = [];
      var totalDuration = 0;
      var counter = 0;

      var startTime;
      function start () {
        startTime = present();
      }

      function stop () {
        var duration = present() - startTime;

        if (counter === frequency) {
          samples.push(duration);
          totalDuration += duration;
          counter = 0;
        }
        counter += 1;
      }

      function results () {
        samples = sortBy(samples);

        return {
          namespace: namespace,
          plugin: plugin,
          name: name,
          frequency: frequency,
          samples: samples.length,
          min: first(samples),
          max: last(samples),
          '50th': getPercentile(0.5, samples),
          '75th': getPercentile(0.75, samples),
          '95th': getPercentile(0.95, samples),
          '99th': getPercentile(0.99, samples)
        };
      }

      var timerObject = {
        fromHere: start,
        toHere: stop,
        results: results
      };

      timers[[namespace, plugin, name].join(':')] = timerObject;

      return timerObject;
    }

    define()('OnDisconnect', function OnDisconnect () {
      return function printTimingResults () {
        each(timers, function (timingData) {
          console.log(timingData.results());
        });
      };
    });

    return {
      removeTimersNotConfigured: removeTimersNotConfigured,
      timer: timer
    };
  }
};