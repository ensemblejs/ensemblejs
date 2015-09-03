'use strict';

var sinon = require('sinon');

module.exports = {
  connect: sinon.spy(),
  disconnect: sinon.spy(),
  setup: sinon.spy(),
  serverPacket: sinon.spy(),
  error: sinon.spy(),
  newGame: sinon.spy(),
  clientConnect: sinon.spy(),
  clientDisconnect: sinon.spy(),
  outgoingServerPacket: sinon.spy(),
  pause: sinon.spy(),
  resume: sinon.spy()
};