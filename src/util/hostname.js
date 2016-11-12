'use strict';

const ip = require('ip');

export const port = () => process.env.PORT || 3000;

export function hostname () {
  if (process.env.NODE_ENV === 'production') {
    return `http://${process.env.HOSTNAME}`;
  }

  if (process.env.NODE_ENV === 'test') {
    return `http://localhost:${port()}`;
  }

  if (process.env.HOSTNAME) {
    return `http://${process.env.HOSTNAME}:${port()}`;
  }

  return `http://${ip.address()}:${port()}`;
}