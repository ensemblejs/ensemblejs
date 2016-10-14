'use strict';

const sinon = require('sinon');
const expect = require('expect');
const makeTestible = require('../../support').makeTestible;
const fakeOn = require('../../fake/on');
const each = require('lodash');
const logger = require('../../fake/logger');
const fakeTime = require('../../fake/time').at(1000);

const saveState = {hi: 'there'};
const playerId = 1;

describe('the state pusher', function () {
  let start;
  let setFixedInterval;

  beforeEach(() => {
    setFixedInterval = sinon.spy();

    const module = makeTestible('state/server/state-pusher', {
      RawStateAccess: {
        for: () => saveState,
        snapshot: () => saveState,
        flush: () => [1, 3, 2]
      },
      Logger: logger,
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
    const socket = {
      id: 1,
      emit: sinon.spy()
    };
    const save = {};

    beforeEach(() => {
      socket.emit.reset();

      start(save, socket, playerId);
    });

    it('should send the initial state to the client', function () {
      expect(socket.emit.firstCall.args).toEqual(['initialState', saveState]);
    });

    it('should send game state based on the configured frequency', function() {
      expect(setFixedInterval.firstCall.args[1]).toEqual(45);
    });

    describe('on state push', function () {
      let push;

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
          highestProcessedMessage: [
            { playerId, deviceNumber: 1, packetId: 0, frameId: 0 }
          ],
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