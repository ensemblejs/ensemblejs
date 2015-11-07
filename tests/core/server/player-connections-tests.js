'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

var game1 = { id: 1, mode: 'arcade' };
var game2 = { id: 2, mode: 'endless' };
var player1 = { request: { sessionID: 1 }, emit: sinon.spy() };
var player2 = { request: { sessionID: 2 }, emit: sinon.spy() };
var player3 = { request: { sessionID: 3 }, emit: sinon.spy() };

describe('players connecting', function () {
  var connectedCount;
  var onClientConnect;
  var onClientDisconnect;

  beforeEach(function () {
    var module = makeTestible('core/server/player-connections', {
      Config: {
        ensemble: {
          minPlayers: 2,
          maxPlayers: 3,
        }
      }
    });

    connectedCount = module[0].connectedCount;
    onClientConnect = module[1].OnClientConnect();
    onClientDisconnect = module[1].OnClientDisconnect();
  });

  describe('when a player connects', function () {
    beforeEach(function () {
      onClientConnect(undefined, player1, game1);
    });

    it('should add a new player connection', function () {
      expect(connectedCount(game1.id)).toEqual(1);
    });

    it('should partion players into games', function () {
      onClientConnect(undefined, player2, game1);
      onClientConnect(undefined, player1, game2);

      expect(connectedCount(game1.id)).toEqual(2);
      expect(connectedCount(game2.id)).toEqual(1);
    });

    describe('when the same player connects again on a different client', function () {

      beforeEach(function () {
        onClientConnect(undefined, player1, game1);
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(game1.id)).toEqual(1);
      });
    });

    describe('when the same player reconnects after disconnecting', function () {

      beforeEach(function () {
        onClientDisconnect(undefined, player1, game1);
        onClientConnect(undefined, player1, game1);
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(game1.id)).toEqual(1);
      });
    });

    describe('when the maxPlayers is exceeded', function () {
      beforeEach(function () {
        onClientConnect(undefined, player1, game1);
        onClientConnect(undefined, player2, game1);
        onClientConnect(undefined, player3, game1);
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(game1.id)).toEqual(3);
      });
    });
  });

  describe('when the number of connected players gets above the minimum', function () {
    it('should set waitingForPlayers to false', function () {
      expect(onClientConnect(undefined, player1, game1).ensemble.waitingForPlayers).toBe(true);
      expect(onClientConnect(undefined, player2, game1).ensemble.waitingForPlayers).toBe(false);
    });
  });

  describe('when the number of connected players falls below the minimum', function () {
    it('should set waitingForPlayers to true', function () {
      expect(onClientConnect(undefined, player1, game1).ensemble.waitingForPlayers).toBe(true);
      expect(onClientConnect(undefined, player2, game1).ensemble.waitingForPlayers).toBe(false);
      expect(onClientDisconnect(undefined, player2, game1).ensemble.waitingForPlayers).toBe(true);
    });
  });

  describe('connectedCount', function () {
    it('should count the number of online player connections', function () {
      onClientConnect(undefined, player1, game1);
      onClientConnect(undefined, player2, game1);
      expect(connectedCount(game1.id)).toEqual(2);
    });

    it('should keep each games player count separate', function () {
      onClientConnect(undefined, player1, game1);
      onClientConnect(undefined, player1, game2);
      onClientConnect(undefined, player2, game2);

      expect(connectedCount(game1.id)).toEqual(1);
      expect(connectedCount(game2.id)).toEqual(2);
    });
  });
});