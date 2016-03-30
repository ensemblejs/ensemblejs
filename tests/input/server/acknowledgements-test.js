'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

var progressAck = sinon.spy();
var ackEvery = sinon.spy();
var ackOnceForAll = sinon.spy();
var ackOnceForAllProgress = sinon.spy();
var ackOnceEach = sinon.spy();
var ackOnceEachProgress = sinon.spy();
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

var logger = require('../../../src/logging/server/logger').logger;

describe('acknowledgements', function () {
  var onIncomingClientInputPacket;
  var config;
  var configGetter;

  beforeEach(function () {
    configGetter = require('../../../src/util/config');
    config = configGetter.get();
    config.ensemble.maxPlayers = 3;

    sinon.stub(configGetter, 'get').returns(config);

    sinon.spy(logger, 'error');

    var acknowledgements = makeTestible('input/server/acknowledgements', {
      StateMutator: mutate,
      StateAccess: fakeState,
      AcknowledgementMap: [['*', {
        'ack-every': [{onComplete: ackEvery, type: 'every'}],
        'ack-once-for-all': [{
          onComplete: ackOnceForAll,
          onProgress: ackOnceForAllProgress,
          type: 'once-for-all'
        }],
        'ack-once-each': [{
          onProgress: ackOnceEachProgress,
          onComplete: ackOnceEach,
          type: 'once-each'
        }],
        'ack-first': [{onComplete: ackFirst, type: 'first-only'}],
        'mutate-this': [
          {onComplete: hasResponse, type: 'every'},
          {onComplete: ackEvery, type: 'every', data: [1, 2, 'a']},
          {onComplete: progressAck, onProgress: progressAck, type: 'once-for-all', data: [1, 2, 'a']}
        ],
      }]]
    });

    onIncomingClientInputPacket = acknowledgements[1].OnIncomingClientInputPacket();
  });

  afterEach(function () {
    configGetter.get.restore();
    logger.error.restore();
  });

  describe('ack every', function () {
    var player1 = { pendingAcks: [{ name: 'ack-every'}], playerId: 1 };

    beforeEach(function () {
      ackEvery.reset();

      onIncomingClientInputPacket(player1, game);
    });

    it('should fire on every ack', function () {
      expect(ackEvery.called).toBe(true);
    });

    it('should continue to fire if the same player acks again', function () {
      onIncomingClientInputPacket(player1, game);

      expect(ackEvery.callCount).toBe(2);
    });
  });

  describe('ack once for all', function () {
    var player1 = { pendingAcks: [{ name: 'ack-once-for-all'}], playerId: 1 };
    var player2 = { pendingAcks: [{ name: 'ack-once-for-all'}], playerId: 2 };
    var player3 = { pendingAcks: [{ name: 'ack-once-for-all'}], playerId: 3 };

    beforeEach(function () {
      ackOnceForAll.reset();
    });

    it('should not fire on ack', function () {
      onIncomingClientInputPacket(player1, game);

      expect(ackOnceForAll.called).toBe(false);

      onIncomingClientInputPacket(player1, game);
    });

    it('should fire a progress ack', function () {
      onIncomingClientInputPacket(player1, game);

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

      onIncomingClientInputPacket(player1, game);
    });

    it('should toggle on duplicate acks from the same player', function () {
      onIncomingClientInputPacket(player1, game);

      ackOnceForAll.reset();
      ackOnceForAllProgress.reset();

      onIncomingClientInputPacket(player1, game);

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
      onIncomingClientInputPacket(player1, game);
      onIncomingClientInputPacket(player2, game);
      expect(ackOnceForAll.called).toBe(false);

      ackOnceForAllProgress.reset();

      onIncomingClientInputPacket(player3, game);
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
      onIncomingClientInputPacket(player1, game);
      onIncomingClientInputPacket(player2, game);
      onIncomingClientInputPacket(player3, game);

      ackOnceForAll.reset();
      ackOnceForAllProgress.reset();

      onIncomingClientInputPacket(player1, game);
      expect(ackOnceForAll.called).toBe(false);
      expect(ackOnceForAllProgress.called).toBe(false);
      onIncomingClientInputPacket(player2, game);
      expect(ackOnceForAll.called).toBe(false);
      expect(ackOnceForAllProgress.called).toBe(false);
      onIncomingClientInputPacket(player3, game);
      expect(ackOnceForAll.called).toBe(false);
      expect(ackOnceForAllProgress.called).toBe(false);
    });
  });

  describe('ack once each', function () {
    var player1 = { pendingAcks: [{name: 'ack-once-each'}], playerId: 1 };
    var player2 = { pendingAcks: [{name: 'ack-once-each'}], playerId: 2 };
    var player3 = { pendingAcks: [{name: 'ack-once-each'}], playerId: 3 };

    beforeEach(function () {
      ackOnceEach.reset();
    });

    it('should fire on each ack', function () {
      onIncomingClientInputPacket(player1, game);

      expect(ackOnceEachProgress.called).toBe(true);

      onIncomingClientInputPacket(player2, game);
      onIncomingClientInputPacket(player3, game);

      expect(ackOnceEachProgress.callCount).toBe(3);
      expect(ackOnceEach.callCount).toBe(1);
    });

    it('should ignore duplicate acks from the same player', function () {
      onIncomingClientInputPacket(player1, game);
      ackOnceEach.reset();
      ackOnceEachProgress.reset();
      onIncomingClientInputPacket(player1, game);

      expect(ackOnceEachProgress.called).toBe(false);
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
    var player1 = { pendingAcks: [{ name: 'mutate-this'}], playerId: 1 };

    beforeEach(function () {
      sinon.spy(logger, 'debug');
      mutate.reset();
      ackEvery.reset();

      onIncomingClientInputPacket(player1, game);
    });

    afterEach(function () {
      logger.debug.restore();
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
      expect(logger.debug.firstCall.args).toEqual([{ack: {
        name: 'mutate-this', playerId: 1 }}, 'Acknowledgement complete.']);
    });

    it('should log the progress of the callback', function () {
      expect(logger.debug.lastCall.args).toEqual([{ack: { name: 'mutate-this', playerId: 1}}, 'Acknowledgement progressed.']);
    });
  });
});