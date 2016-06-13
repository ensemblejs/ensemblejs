'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var fakeOn = require('../../fake/on');
var each = require('lodash');
var logger = require('../../fake/logger');
var fakeOn = require('../../fake/on');
var fakeTime = require('../../fake/time').at(1000);

var saveState = {
  hi: 'there',
};

describe('the state pusher', function () {
  var start;
  var OnServerStop;

  beforeEach(() => {
    var module = makeTestible('state/server/state-pusher', {
      RawStateAccess: {
        for: function() {
          return saveState;
        },
        changes: function () {
          return saveState;
        }
      },
      Logger: logger,
      LowestInputProcessed: sinon.spy(),
      On: fakeOn,
      Time: fakeTime,
    });

    start = module[0].start;
    OnServerStop = module[1].OnServerStop();

    fakeOn.outgoingServerPacket.reset();

    sinon.stub(global, 'setInterval');
  });

  afterEach(() => {
    each(setInterval.returnValues, function(id) {
      clearInterval(id);
    });

    setInterval.restore();
  });

  describe('on start', () => {
    var socket = {
      id: 1,
      emit: sinon.spy()
    };
    var save = {};

    beforeEach(() => {
      socket.emit.reset();

      start(save, socket);
    });

    it('should send the initial state to the client', function () {
      expect(socket.emit.firstCall.args).toEqual(['initialState', saveState]);
    });

    it('should send game state based on the configured frequency', function() {
      expect(setInterval.firstCall.args[1]).toEqual(45);
    });

    describe('on state push', function () {
      var push;

      beforeEach(() => {
        push = setInterval.firstCall.args[0];
      });

      it('should send the packet', function () {
        push();

        fakeOn.outgoingServerPacket.reset();
        saveState.altered = true;
        push();

        expect(fakeOn.outgoingServerPacket.callCount).toEqual(1);
        expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual([1, {
          saveState: {hi: 'there', altered: true},
          id: 6,
          highestProcessedMessage: undefined,
          timestamp: 1000
        }]);
      });

      it('should give each packet an id', function () {
        fakeOn.outgoingServerPacket.reset();

        push();

        expect(fakeOn.outgoingServerPacket.firstCall.args[1].id).toEqual(7);
      });

      it('should record the sent time of each packet', function () {
        push();

        expect(fakeOn.outgoingServerPacket.firstCall.args[1].timestamp).toEqual(1000);
      });
    });
  });

  describe('on server stop', () => {
    it('should clear all intervals');
  });

  describe('on client disconnect', () => {
    // var OnClientDisconnect;

    beforeEach(() => {
      // start();
      // OnClientDisconnect = module[1].OnClientDisconnect();
    });
    it('should clear the interval for the client');
    it('should not clear other intervals');
  });
});