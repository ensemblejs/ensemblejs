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
      setOffset: offset => (timeOffset = offset),
      present: () => now() + timeOffset,
      absolute: () => moment().unix(),
      precise: () => moment().valueOf(),
      sinceStart: () => now() - start,
      atStart: () => startUnix
    };
  }
};