'use strict';

var sinon = require('sinon');

module.exports = {
  clientConnect: sinon.spy(),
  clientDisconnect: sinon.spy(),
  connect: sinon.spy(),
  disconnect: sinon.spy(),
  error: sinon.spy(),
  incomingServerPacket: sinon.spy(),
  newGame: sinon.spy(),
  outgoingServerPacket: sinon.spy(),
  pause: sinon.spy(),
  resume: sinon.spy(),
  setup: sinon.spy()
};