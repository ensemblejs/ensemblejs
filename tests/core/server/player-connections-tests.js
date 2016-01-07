'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var players = require('../../../src/util/models/players');
var fakeOn = require('../../fake/on');
var config = require('../../../src/util/config');

var save1 = { id: 1, mode: 'arcade' };
var save2 = { id: 2, mode: 'endless' };
var player1 = { request: { sessionID: 1 }, emit: sinon.spy() };
var player2 = { request: { sessionID: 2 }, emit: sinon.spy() };
var player3 = { request: { sessionID: 3 }, emit: sinon.spy() };

describe('players connecting', function () {
  var connectedCount;
  var onClientConnect;
  var onClientDisconnect;

  beforeEach(function () {
    var module = makeTestible('core/server/player-connections', {
      On: fakeOn
    });

    sinon.spy(players, 'getByKey');
    sinon.stub(config, 'get').returns({
      game: {
        id: 1
      },
      minPlayers: function () { return 2; },
      maxPlayers: function () { return 3; }
    });

    fakeOn.playerGroupChange.reset();

    connectedCount = module[0].connectedCount;
    onClientConnect = module[1].OnClientConnect();
    onClientDisconnect = module[1].OnClientDisconnect();
  });

  afterEach(function () {
    config.get.restore();
    players.getByKey.restore();
  });

  describe('when a player connects', function () {
    beforeEach(function () {
      onClientConnect(undefined, player1, save1);
    });

    it('should add a new player connection', function () {
      expect(connectedCount(save1.id)).toEqual(1);
    });

    it('should publish the players and their status in the game', function () {
      expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ id: 1, status: 'online'}, {id: 2, status: 'not-joined'}, {id: 3, status: 'not-joined'}], 1]);
    });

    it('should partion players into games', function () {
      onClientConnect(undefined, player2, save1);
      onClientConnect(undefined, player1, save2);

      expect(connectedCount(save1.id)).toEqual(2);
      expect(connectedCount(save2.id)).toEqual(1);
    });

    describe('when the same player connects again on a different client', function () {

      beforeEach(function () {
        onClientConnect(undefined, player1, save1);
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(save1.id)).toEqual(1);
      });

      it('should publish the players and their status in the game', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ id: 1, status: 'online'}, {id: 2, status: 'not-joined'}, {id: 3, status: 'not-joined'}], 1]);
      });
    });

    describe('when a player disconnects', function () {
      beforeEach(function () {
        fakeOn.playerGroupChange.reset();

        onClientDisconnect(undefined, player1, save1);
      });

      it('should publish the players and their status in the game', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ id: 1, status: 'offline'}, {id: 2, status: 'not-joined'}, {id: 3, status: 'not-joined'}], 1]);
      });
    });

    describe('when the same player reconnects after disconnecting', function () {

      beforeEach(function () {
        onClientDisconnect(undefined, player1, save1);

        fakeOn.playerGroupChange.reset();

        onClientConnect(undefined, player1, save1);
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(save1.id)).toEqual(1);
      });

      it('should publish the players and their status in the game', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ id: 1, status: 'online'}, {id: 2, status: 'not-joined'}, {id: 3, status: 'not-joined'}], 1]);
      });
    });

    describe('when the maxPlayers is exceeded', function () {
      beforeEach(function () {
        onClientConnect(undefined, player1, save1);
        onClientConnect(undefined, player2, save1);
        onClientConnect(undefined, player3, save1);
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(save1.id)).toEqual(3);
      });
    });
  });

  describe('when a second player connects', function () {
    beforeEach(function () {
      onClientConnect(undefined, player1, save1);

      fakeOn.playerGroupChange.reset();

      onClientConnect(undefined, player2, save1);
    });

    it('should publish the players and their status in the game', function () {
      expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ id: 1, status: 'online'}, {id: 2, status: 'online'}, {id: 3, status: 'not-joined'}], 1]);
    });
  });

  describe('when the number of connected players gets above the minimum', function () {
    it('should set waitingForPlayers to false', function () {
      expect(onClientConnect(undefined, player1, save1)).toEqual(['ensemble.waitingForPlayers', true]);
      expect(onClientConnect(undefined, player2, save1)).toEqual(['ensemble.waitingForPlayers', false]);
    });
  });

  describe('when the number of connected players falls below the minimum', function () {
    it('should set waitingForPlayers to true', function () {
      expect(onClientConnect(undefined, player1, save1)).toEqual(['ensemble.waitingForPlayers', true]);
      expect(onClientConnect(undefined, player2, save1)).toEqual(['ensemble.waitingForPlayers', false]);
      expect(onClientDisconnect(undefined, player2, save1)).toEqual(['ensemble.waitingForPlayers', true]);
    });
  });

  describe('connectedCount', function () {
    it('should count the number of online player connections', function () {
      onClientConnect(undefined, player1, save1);
      onClientConnect(undefined, player2, save1);
      expect(connectedCount(save1.id)).toEqual(2);
    });

    it('should keep each games player count separate', function () {
      onClientConnect(undefined, player1, save1);
      onClientConnect(undefined, player1, save2);
      onClientConnect(undefined, player2, save2);

      expect(connectedCount(save1.id)).toEqual(1);
      expect(connectedCount(save2.id)).toEqual(2);
    });
  });
});