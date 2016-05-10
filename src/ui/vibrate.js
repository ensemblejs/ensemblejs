'use strict';

import vibrate from 'vibrate';

function start (pattern = 1000) {
  vibrate(pattern);
}

function stop () {
  vibrate(0);
}

module.exports = {
  type: 'Vibrate',
  func: function Vibrate () {
    return {
      start, stop
    };
  }
};