'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var fakeOn = require('../../fake/on');
var each = require('lodash');
var logger = require('../../fake/logger');
var fakeTime = require('../../fake/time').at(1000);

let saveState = {hi: 'there'};

describe('the state pusher', function () {
  var start;
  let setFixedInterval;

  beforeEach(() => {
    setFixedInterval = sinon.spy();

    var module = makeTestible('state/server/state-pusher', {
      RawStateAccess: {
        for: () => saveState,
        snapshot: () => saveState,
        flush: () => [1, 3, 2]
      },
      Logger: logger,
      LowestInputProcessed: sinon.spy(),
      On: fakeOn,
      Time: fakeTime
    }, {
      'fixed-setinterval': setFixedInterval
    });

    start = module[0].start;

    fakeOn.outgoingServerPacket.reset();
  });

  afterEach(() => {
    each(setFixedInterval.returnValues, function(id) {
      clearInterval(id);
    });
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
      expect(setFixedInterval.firstCall.args[1]).toEqual(48);
    });

    describe('on state push', function () {
      var push;

      beforeEach(() => {
        push = setFixedInterval.firstCall.args[0];
      });

      it('should send the packet', function () {
        push();

        fakeOn.outgoingServerPacket.reset();
        saveState.altered = true;
        push();

        expect(fakeOn.outgoingServerPacket.callCount).toEqual(1);
        expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual([1, {
          id: 2,
          highestProcessedMessage: undefined,
          timestamp: 1000,
          measure: 1000,
          changeDeltas: [1, 3, 2]
        }]);
      });

      it('should give each packet an id', function () {
        fakeOn.outgoingServerPacket.reset();

        push();

        expect(fakeOn.outgoingServerPacket.firstCall.args[1].id).toEqual(3);
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
    it('should clear the interval for the client');
    it('should not clear other intervals');
  });
});