'use strict';

var sinon = require('sinon');

module.exports = {
  connect: sinon.spy(),
  disconnect: sinon.spy(),
  setup: sinon.spy(),
  serverPacket: sinon.spy(),
  error: sinon.spy()
};