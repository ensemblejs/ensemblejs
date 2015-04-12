'use strict';

module.exports = function (key, duration, onComplete) {
  onComplete = onComplete || function () { return undefined; };

  var age = 0;
  var done = function () {
    return duration === 0 ? true : age >= duration;
  };

  return {
    key: key,
    tick: function (dt) {
      if (done()) {
        return;
      }

      age += dt;

      if (done()) {
        onComplete();
      }
    },
    cancel: function () {
      age = duration;
    },
    isAlive: function () {
      return !done();
    }
  };
};