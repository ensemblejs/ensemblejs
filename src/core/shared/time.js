'use strict';

var now = require('present');
var moment = require('moment');

module.exports = {
  type: 'Time',
  func: function Time () {
    var timeOffset = 0;
    var start = now();
    var startUnix = moment().unix();

    return {
      setOffset: function setOffset (offset) {
        timeOffset = offset;
      },
      present: function present () {
        return now() + timeOffset;
      },
      sinceStart: function sinceStart () {
        return now() - start;
      },
      atStart: function atStart () {
        return startUnix;
      }
    };
  }
};