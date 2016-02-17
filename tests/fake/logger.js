'use strict';

var sinon = require('sinon');

function logMessageOnly () {
  if (arguments.length === 1) {
    console.log(arguments[0]);
  } else {
    console.log(arguments[1]);
  }
}

function silent () {}

var logging = {
  loaded: sinon.spy(),
  plugin: sinon.spy(),
  subdue: sinon.spy(),
  called: sinon.spy(),
  debug: silent,
  filename: sinon.spy(),
  info: silent,
  warn: logMessageOnly,
  error: logMessageOnly,
  socket: sinon.spy(),
  trace: silent
};

sinon.spy(logging, 'trace');
sinon.spy(logging, 'debug');
sinon.spy(logging, 'info');
sinon.spy(logging, 'warn');
sinon.spy(logging, 'error');

module.exports = logging;
