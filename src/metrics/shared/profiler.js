'use strict';

var select = require('lodash').select;
var each = require('lodash').each;
var includes = require('lodash').includes;
var startsWith = require('lodash').startsWith;

module.exports = {
  type: 'Profiler',
  deps: ['DefinePlugin', 'Config', 'Timer'],
  func: function Profiler (define, config, timer) {
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

    function wrapTimer (namespace, plugin, name, frequency) {
      var key = [namespace, plugin, name].join(':');
      var t = timer().make(namespace, plugin, name, frequency);

      if (shouldMeasureKey(key)) {
        t.key = key;
        timers.push(t);
      }

      return t;
    }

    return {
      timer: wrapTimer
    };
  }
};