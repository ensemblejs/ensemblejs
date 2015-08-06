'use strict';

//TODO: move to common library
module.exports = {
  type: 'Interval',
  func: function Interval () {
    var millisPerSecond = 1000;
    var secondsPerMinute = 60;
    var minutesPerHour = 60;
    var secondsPerHour = secondsPerMinute * minutesPerHour;

    function sample (callback, frequency) {
      var timeSinceLast = 0;

      return function (state, delta) {
        timeSinceLast += delta;

        if (timeSinceLast >= frequency) {
          callback(state, delta);
          timeSinceLast -= frequency;
        }
      };
    }

    return function execute (fx) {
      return {
        every: function every (n) {
          function milliseconds () {
            return sample(fx, n / millisPerSecond);
          }
          function seconds () {
            return sample(fx, n);
          }
          function minutes () {
            return sample(fx, n * secondsPerMinute);
          }
          function hours () {
            return sample(fx, n * secondsPerHour);
          }

          return {
            millisecond: milliseconds,
            milliseconds: milliseconds,
            second: seconds,
            seconds: seconds,
            minute: minutes,
            minutes: minutes,
            hour: hours,
            hours: hours
          };
        },
        about: function about (i) {
          return {
            timesPer: {
              second: function second () {
                return sample(fx, 1 / i);
              },
              minute: function minute () {
                return sample(fx, secondsPerMinute / i);
              },
              hour: function hour () {
                return sample(fx, secondsPerHour / i);
              }
            }
          };
        }
      };
    };
  }
};