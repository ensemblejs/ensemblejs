'use strict';

var select = require('lodash').select;
var each = require('lodash').each;
var includes = require('lodash').includes;
var startsWith = require('lodash').startsWith;

module.exports = {
  type: 'Profiler',
  deps: ['DefinePlugin', 'Config', 'Timer', 'Metrics'],
  func: function Profiler (define, config, timer, metrics) {
    var timers = [];
    var exact = [];
    var wildcard = [
      'ensemblejs.',
      'Game.',
    ];

    function shouldMeasureKey (key) {
      return includes(exact, key) || select(wildcard, function(t) {
          return startsWith(key, t);
        }).length > 0;
    }

    function removeTimersNotConfigured () {
      var configuredTimers = config().measure.timers;

      exact = select(configuredTimers, function(t) {
        return !includes(t, '*');
      });
      wildcard = select(configuredTimers, function(t) {
        return includes(t, '*');
      }).map(function removeWildcard(t) {
        return t.replace('*', '');
      });

      timers = select(timers, function(timerData) {
        return shouldMeasureKey(timerData.key);
      });
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
          console.log(timingData.results(false, true));
          metrics().profile(timingData.key, timingData.results(true));
        });
      };
    });

    define()('OnServerStop', function Profiler () {
      return function printTimingResults () {
        each(timers, function print (timingData) {
          console.log(timingData.results(false, true));
          metrics().profile(timingData.key, timingData.results(true));
        });
      };
    });

    function wrapTimer (namespace, plugin, name, frequency) {
      var t = timer().make(namespace, plugin, name, frequency);

      if (shouldMeasureKey(t.key)) {
        timers.push(t);
      }

      return t;
    }

    return {
      timer: wrapTimer
    };
  }
};