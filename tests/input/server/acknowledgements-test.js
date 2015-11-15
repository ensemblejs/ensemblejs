'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

var progressAck = sinon.spy();
var ackEvery = sinon.spy();
var ackOnceForAll = sinon.spy();
var ackOnceForAllProgress = sinon.spy();
var ackOnceEach = sinon.spy();
var ackFirst = sinon.spy();
var game = {
  id: 100,
  mode: 'acknowledgements-test'
};
var mutate = sinon.spy();
var fakeState = {
  for: function (gameId) {
    return gameId;
  }
};

function hasResponse () {
  return { state: 'changed' };
}

var fakeLogger = require('../../fake/logger');
var config = require('../../../src/util/config')(fakeLogger);

describe('acknowledgements', function () {
  var onIncomingClientInputPacket;

  beforeEach(function () {
    config.ensemble.maxPlayers = 3;

    fakeLogger.error.reset();

    var acknowledgements = makeTestible('input/server/acknowledgements', {
      Config: config,
      StateMutator: mutate,
      StateAccess: fakeState,
      Logger: fakeLogger,
      AcknowledgementMap: [['*', {
        'ack-every': [{onComplete: ackEvery, type: 'every'}],
        'ack-once-for-all': [{
          onComplete: ackOnceForAll,
          onProgress: ackOnceForAllProgress,
          type: 'once-for-all'
        }],
        'ack-once-each': [{ onComplete: ackOnceEach, type: 'once-each' }],
        'ack-first': [{onComplete: ackFirst, type: 'first-only'}],
        'mutate-this': [
          {onComplete: hasResponse, type: 'every'},
          {onComplete: ackEvery, type: 'every', data: [1, 2, 'a']},
          {onComplete: progressAck, onProgress: progressAck, type: 'once-for-all', data: [1, 2, 'a']}
        ],
      }]]
    });

    onIncomingClientInputPacket = acknowledgements[0];
  });

  describe('ack every', function () {
    var pendingAcks = [{ name: 'ack-every', playerId: 1 }];

    beforeEach(function () {
      ackEvery.reset();

      onIncomingClientInputPacket({pendingAcks: pendingAcks}, game);
    });

    it('should fire on every ack', function () {
      expect(ackEvery.called).toBe(true);
    });

    it('should continue to first if the same player acks again', function () {
      onIncomingClientInputPacket({pendingAcks: pendingAcks}, game);

      expect(ackEvery.callCount).toBe(2);
    });
  });

  describe('ack once for all', function () {
    var player1 = [{ name: 'ack-once-for-all', playerId: 1 }];
    var player2 = [{ name: 'ack-once-for-all', playerId: 2 }];
    var player3 = [{ name: 'ack-once-for-all', playerId: 3 }];

    beforeEach(function () {
      ackOnceForAll.reset();
    });

    it('should not fire on ack', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);

      expect(ackOnceForAll.called).toBe(false);

      onIncomingClientInputPacket({pendingAcks: player1}, game);
    });

    it('should fire a progress ack', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);

      expect(ackOnceForAllProgress.called).toBe(true);
      expect(ackOnceForAllProgress.firstCall.args).toEqual([
        100,
        {
          name: 'ack-once-for-all',
          playerId: 1
        },
        [1],
        undefined
      ]);

      onIncomingClientInputPacket({pendingAcks: player1}, game);
    });

    it('should toggle on duplicate acks from the same player', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);

      ackOnceForAll.reset();
      ackOnceForAllProgress.reset();

      onIncomingClientInputPacket({pendingAcks: player1}, game);

      expect(ackOnceForAll.called).toBe(false);

      expect(ackOnceForAllProgress.called).toBe(true);
      expect(ackOnceForAllProgress.firstCall.args).toEqual([
        100,
        {
          name: 'ack-once-for-all',
          playerId: 1
        },
        [],
        undefined
      ]);
    });

    it('should fire only when each player has acked once', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);
      onIncomingClientInputPacket({pendingAcks: player2}, game);
      expect(ackOnceForAll.called).toBe(false);

      ackOnceForAllProgress.reset();

      onIncomingClientInputPacket({pendingAcks: player3}, game);
      expect(ackOnceForAll.called).toBe(true);

      expect(ackOnceForAllProgress.called).toBe(true);
      expect(ackOnceForAllProgress.firstCall.args).toEqual([
        100,
        {
          name: 'ack-once-for-all',
          playerId: 3
        },
        [1, 2, 3],
        undefined
      ]);
    });

    it('should not fire a second time', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);
      onIncomingClientInputPacket({pendingAcks: player2}, game);
      onIncomingClientInputPacket({pendingAcks: player3}, game);

      ackOnceForAll.reset();
      ackOnceForAllProgress.reset();

      onIncomingClientInputPacket({pendingAcks: player1}, game);
      expect(ackOnceForAll.called).toBe(false);
      expect(ackOnceForAllProgress.called).toBe(false);
      onIncomingClientInputPacket({pendingAcks: player2}, game);
      expect(ackOnceForAll.called).toBe(false);
      expect(ackOnceForAllProgress.called).toBe(false);
      onIncomingClientInputPacket({pendingAcks: player3}, game);
      expect(ackOnceForAll.called).toBe(false);
      expect(ackOnceForAllProgress.called).toBe(false);
    });
  });

  describe('ack once each', function () {
    var player1 = [{ name: 'ack-once-each', playerId: 1 }];
    var player2 = [{ name: 'ack-once-each', playerId: 2 }];
    var player3 = [{ name: 'ack-once-each', playerId: 3 }];

    beforeEach(function () {
      ackOnceEach.reset();
    });

    it('should fire on each ack', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);

      expect(ackOnceEach.called).toBe(true);

      onIncomingClientInputPacket({pendingAcks: player2}, game);
      onIncomingClientInputPacket({pendingAcks: player3}, game);

      expect(ackOnceEach.callCount).toBe(3);
    });

    it('should ignore duplicate acks from the same player', function () {
      onIncomingClientInputPacket({pendingAcks: player1}, game);
      ackOnceEach.reset();
      onIncomingClientInputPacket({pendingAcks: player1}, game);

      expect(ackOnceEach.called).toBe(false);
    });
  });

  describe('ack for first', function () {
    var player1 = [{ name: 'ack-first', playerId: 1 }];
    var player2 = [{ name: 'ack-first', playerId: 2 }];
    var player3 = [{ name: 'ack-first', playerId: 3 }];

    beforeEach(function () {
      ackFirst.reset();
    });

    it('should fire on the first ack', function () {
      onIncomingClientInputPacket({pendingAcks: player3}, game);

      expect(ackFirst.called).toBe(true);
    });

    it('should ignore any other acks', function () {
      onIncomingClientInputPacket({pendingAcks: player3}, game);
      ackFirst.reset();
      onIncomingClientInputPacket({pendingAcks: player1}, game);
      onIncomingClientInputPacket({pendingAcks: player2}, game);

      expect(ackFirst.called).toBe(false);
    });
  });

  describe('on ack', function () {
    var pendingAcks = [{ name: 'mutate-this', playerId: 1 }];

    beforeEach(function () {
      fakeLogger.debug.reset();
      mutate.reset();
      ackEvery.reset();

      onIncomingClientInputPacket({pendingAcks: pendingAcks}, game);
    });

    it('should mutate the response of the callback', function () {
      expect(mutate.called).toBe(true);
      expect(mutate.firstCall.args).toEqual([100, { state: 'changed' }]);
    });

    it('should pass the playerId into the callback', function () {
      expect(ackEvery.firstCall.args[1]).toEqual({ name: 'mutate-this', playerId: 1});
    });

    it('should pass optional data into the callback', function () {
      expect(ackEvery.firstCall.args[2]).toEqual([1, 2, 'a']);
    });

    it('should log the firing of the callback', function () {
      expect(fakeLogger.debug.firstCall.args).toEqual(['Acknowledgement "mutate-this" complete.']);
    });

    it('should log the progress of the callback', function () {
      expect(fakeLogger.debug.lastCall.args).toEqual(['Acknowledgement "mutate-this" progressed.']);
    });
  });
});