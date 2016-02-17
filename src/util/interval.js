'use strict';

var millisPerSecond = 1000;
var secondsPerMinute = 60;
var minutesPerHour = 60;
var secondsPerHour = secondsPerMinute * minutesPerHour;

function createSampleFunc (callback, frequency) {
  var timeSinceLast = 0;

  return function sample (state, delta) {
    timeSinceLast += delta;

    if (timeSinceLast >= frequency) {
      timeSinceLast -= frequency;
      return callback(state, delta);
    }
  };
}

function createThrottleFunc (callback, frequency) {
  var callsSinceLast = 0;

  return function throttle (state, delta) {
    callsSinceLast += 1;

    if (callsSinceLast >= frequency) {
      callsSinceLast = 0;
      return callback(state, delta);
    }
  };
}

module.exports = {
  execute: function execute (fx) {
    return {
      every: function every (n) {
        n = n || 1;

        function milliseconds () {
          return createSampleFunc(fx, n / millisPerSecond);
        }
        function seconds () {
          return createSampleFunc(fx, n);
        }
        function minutes () {
          return createSampleFunc(fx, n * secondsPerMinute);
        }
        function hours () {
          return createSampleFunc(fx, n * secondsPerHour);
        }
        function calls () {
          return createThrottleFunc(fx, n);
        }

        return {
          millisecond: milliseconds,
          milliseconds: milliseconds,
          second: seconds,
          seconds: seconds,
          minute: minutes,
          minutes: minutes,
          hour: hours,
          hours: hours,
          call: calls,
          calls: calls,
        };
      },
      about: function about (i) {
        return {
          timesPer: {
            second: function second () {
              return createSampleFunc(fx, 1 / i);
            },
            minute: function minute () {
              return createSampleFunc(fx, secondsPerMinute / i);
            },
            hour: function hour () {
              return createSampleFunc(fx, secondsPerHour / i);
            }
          }
        };
      }
    };
  }
};