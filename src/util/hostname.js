'use strict';

var ip = require('ip');

export function port () {
  return process.env.PORT || 3000;
}

export function hostname () {
  if (process.env.NODE_ENV === 'test') {
    return `http://localhost:${port()}`;
  }

  if (process.env.HOSTNAME) {
    return `http://${process.env.HOSTNAME}:${port()}`;
  }

  return `http://${ip.address()}:${port()}`;
}