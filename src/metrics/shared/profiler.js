'use strict';

var sortBy = require('lodash').sortBy;
var first = require('lodash').first;
var last = require('lodash').last;
var select = require('lodash').select;
var each = require('lodash').each;
var includes = require('lodash').includes;
var startsWith = require('lodash').startsWith;

module.exports = {
  type: 'Profiler',
  deps: ['DefinePlugin', 'Config', 'Time'],
  func: function Profiler (define, config, time) {
    var timers = [];
    var exact = [];
    var wildcard = [
      'ensemblejs:',
      'Game:',
    ];

    function shouldMeasureKey (key) {
      return includes(exact, key) || select(wildcard, function(timer) {
          return startsWith(key, timer);
        }).length > 0;
    }

    function removeTimersNotConfigured () {
      var configuredTimers = config().measure.timers;

      exact = select(configuredTimers, function(timer) {
        return !includes(timer, '*');
      });
      wildcard = select(configuredTimers, function(timer) {
        return includes(timer, '*');
      }).map(function(timer) {
        return timer.replace('*', '');
      });

      timers = select(timers, function(timerData) {
        return shouldMeasureKey(timerData.key);
      });
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
      var key = [namespace, plugin, name].join(':');
      var samples = [];
      var totalDuration = 0;
      var counter = 0;
      var startTime;

      function start () {
        startTime = time().present();
      }

      function stop () {
        var duration = time().present() - startTime;

        add(duration);
      }

      function add (duration) {
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
        key: key,
        fromHere: start,
        toHere: stop,
        manual: add,
        results: results
      };

      if (shouldMeasureKey(key)) {
        timers.push(timerObject);
      }

      return timerObject;
    }

    define()('OnServerStart', function Profiler () {
      return removeTimersNotConfigured;
    });

    define()('OnClientStart', function Profiler () {
      return removeTimersNotConfigured;
    });

    define()('OnDisconnect', function Profiler () {
      return function printTimingResults () {
        each(timers, function print (timingData) {
          console.log(timingData.results());
        });
      };
    });

    define()('OnServerStop', function Profiler () {
      return function printTimingResults () {
        each(timers, function print (timingData) {
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