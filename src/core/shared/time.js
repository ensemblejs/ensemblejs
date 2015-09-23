'use strict';

var now = require('present');

module.exports = {
  type: 'Time',
  func: function Time () {
    var timeOffset = 0;
    var start = now();

    return {
      setOffset: function setOffset (offset) {
        timeOffset = offset;
      },
      present: function present () {
        return now() + timeOffset;
      },
      sinceStart: function sinceStart () {
        return now() - start;
      }
    };
  }
};