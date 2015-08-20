'use strict';

var expect = require('expect');
var sinon = require('sinon');
var jsdom = require('jsdom').jsdom;

var defer = function(dep) {
  return function() {
    return dep;
  };
};

var SocketClient = {
  connect: sinon.spy()
};
var socket = {
  SocketClient: function () {
    return SocketClient;
  }
};
var dimensions = {};
var updateLoop = {
  run: sinon.spy()
};
var c1 = sinon.spy();
var c2 = sinon.spy();
var resizeCallbacks = [c1, c2];

describe.skip('the assembler', function () {
  before(function(done) {
    jsdom.env({
      html: '<html><body><div id="cdiv">With content.</div></body></html>',
      done: function(err, window) {
        global.window = window;
        global.getComputedStyle = function() {};

        done();
      }});
  });

  beforeEach(function () {
    var assembler = require('../src/assembler').func(defer(socket), defer(dimensions), defer(global.window), defer(updateLoop), defer(resizeCallbacks));

    assembler.assembleAndRun();
  });

  it ('should connect the socket client', function () {
    expect(SocketClient.connect.called).toBe(true);
  });

  it ('should start the update loop', function () {
    expect(updateLoop.run.called).toBe(true);
  });
});