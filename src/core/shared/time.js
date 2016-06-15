'use strict';

const now = require('present');
const moment = require('moment');

module.exports = {
  type: 'Time',
  func: function Time () {
    const start = now();
    const startUnix = moment().unix();
    let timeOffset = 0;

    return {
      setOffset: function setOffset (offset) {
        timeOffset = offset;
      },
      present: function present () {
        return now() + timeOffset;
      },
      absolute: function absolute () {
        return moment().unix();
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