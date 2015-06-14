'use strict';

module.exports = function (key, duration, onComplete) {
  onComplete = onComplete || function () { return undefined; };

  var age = 0;
  var done = function () {
    return duration === 0 ? true : age >= duration;
  };

  return {
    key: key,
    tick: function (state, dt, gameId) {
      if (done()) {
        return;
      }

      age += dt;

      if (done()) {
        onComplete(state, gameId);
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