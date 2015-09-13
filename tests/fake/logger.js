'use strict';

var sinon = require('sinon');

var logging = {
  loaded: sinon.spy(),
  plugin: sinon.spy(),
  subdue: sinon.spy(),
  called: sinon.spy(),
  debug: sinon.spy(),
  filename: sinon.spy(),
  info: sinon.spy(),
  warn: sinon.spy()
};

module.exports = logging;