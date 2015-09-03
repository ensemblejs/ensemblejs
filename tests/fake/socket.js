'use strict';

var sinon = require('sinon');
var io = require('socket.io-client');

var savedEvents = {};
var underlyingSocket = {
  savedEvents: function () { return savedEvents; },
  reset: function () { savedEvents = {}; },
  on: function(name, f) {
    savedEvents[name] = savedEvents[name] || [];
    savedEvents[name].push(f);
  },
  emit: sinon.spy()
};

io.connect = function () {
  return underlyingSocket;
};

module.exports = {
  socket: underlyingSocket,
  fake: function fake () {
    return io;
  },
  fakeWith: function fakeWith (fakeSocket) {
    underlyingSocket = fakeSocket;

    if (!underlyingSocket.emit) {
      underlyingSocket.emit = sinon.spy();
    }

    return io;
  }
};
