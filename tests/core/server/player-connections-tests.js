'use strict';

import Bluebird from 'bluebird';
var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var players = require('../../../src/util/models/players');
var fakeOn = require('../../fake/on');
var config = require('../../../src/util/config');

var save1 = { id: 1, mode: 'arcade' };
var save2 = { id: 2, mode: 'endless' };
var player1 = { request: { sessionID: 1 }, emit: sinon.spy(), client: { conn: { remoteAddress: '::ffff:192.168.0.9'}}};
var player1Device2 = { request: { sessionID: 11 }, emit: sinon.spy(), client: { conn: { remoteAddress: '::ffff:192.168.0.9'}}};
var player2 = { request: { sessionID: 2 }, emit: sinon.spy(), client: { conn: { remoteAddress: '::ffff:192.168.0.9'}}};
var player3 = { request: { sessionID: 3 }, emit: sinon.spy(), client: { conn: { remoteAddress: '::ffff:192.168.0.9'}}};

describe('players connecting', function () {
  var connectedCount;
  var onClientConnect;
  var onClientDisconnect;

  var getByDevice;
  beforeEach(function () {
    var module = makeTestible('core/server/player-connections', {
      On: fakeOn
    });

    getByDevice = sinon.stub(players, 'getByDevice');
    getByDevice.returns(Bluebird.resolve([{id: 1}]));
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
    getByDevice.restore();
  });

  describe('when a player connects', function () {
    beforeEach(done => {
      onClientConnect(undefined, player1, save1)
        .then(() => done())
        .catch(() => done());
    });

    it('should send an error if no player found');
    it('should send an error if more than one player per device');

    describe('with a player', function () {
      it('should add a new player connection', function () {
        expect(connectedCount(save1.id)).toEqual(1);
      });

      it('should publish the players and their status in the game', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ number: 1, status: 'online', playerId: 1, devices: [1], onSameSubnet: true}, {number: 2, status: 'not-joined', devices: []}, {number: 3, status: 'not-joined', devices: []}], 1]);
      });

      it('should partion players into games', function (done) {
        onClientConnect(undefined, player2, save1)
          .then(() => {
            expect(connectedCount(save1.id)).toEqual(2);
          })
          .then(() => onClientConnect(undefined, player1, save2) )
          .then(() => {
            expect(connectedCount(save2.id)).toEqual(1);
          })
          .then(() => done() )
          .catch(() => done() );
      });

      describe('when the same player connects again on a different client', function () {

        beforeEach(function (done) {
          onClientConnect(undefined, player1, save1)
            .then(() => done() )
            .catch(() => done() );
        });

        it('should not add a new player connection', function () {
          expect(connectedCount(save1.id)).toEqual(1);
        });

        it('should publish the players and their status in the game', function () {
          expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ number: 1, status: 'online', playerId: 1, devices: [1], onSameSubnet: true}, {number: 2, status: 'not-joined', devices: []}, {number: 3, status: 'not-joined', devices: []}], 1]);
        });
      });
    });

    describe('when a player disconnects', function () {
      beforeEach(function (done) {
        fakeOn.playerGroupChange.reset();

        onClientDisconnect(undefined, player1, save1)
          .then(() => done());
      });

      it('should publish the players and their status in the game', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ number: 1, status: 'offline', playerId: 1, devices: [], onSameSubnet: true}, {number: 2, status: 'not-joined', devices: []}, {number: 3, status: 'not-joined', devices: []}], 1]);
      });
    });

    describe('when a player disconnects one of their devices', function () {
      beforeEach(function (done) {
        fakeOn.playerGroupChange.reset();

        onClientConnect(undefined, player1Device2, save1)
          .then(() => {
            onClientDisconnect(undefined, player1, save1);
          })
          .then(() => done());
      });

      it('should not mark players as "offline" if they have at least one device connected', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ number: 1, status: 'online', playerId: 1, devices: [1, 11], onSameSubnet: true}, {number: 2, status: 'not-joined', devices: []}, {number: 3, status: 'not-joined', devices: []}], 1]);
      });
    });

    describe('when the same player reconnects after disconnecting', function () {

      beforeEach(function (done) {
        onClientDisconnect(undefined, player1, save1)
          .then(() => fakeOn.playerGroupChange.reset())
          .then(() => onClientConnect(undefined, player1, save1))
          .then(() => done())
          .catch(() => done());
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(save1.id)).toEqual(1);
      });

      it('should publish the players and their status in the game', function () {
        expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ number: 1, status: 'online', playerId: 1, devices: [1], onSameSubnet: true}, {number: 2, status: 'not-joined', devices: []}, {number: 3, status: 'not-joined', devices: []}], 1]);
      });
    });

    describe('when the maxPlayers is exceeded', function () {
      beforeEach(function (done) {
        onClientConnect(undefined, player1, save1)
          .then(() => getByDevice.returns(Bluebird.resolve([{id: 2}])))
          .then(() => onClientConnect(undefined, player2, save1))
          .then(() => getByDevice.returns(Bluebird.resolve([{id: 3}])))
          .then(() => onClientConnect(undefined, player3, save1))
          .then(() => done())
          .catch(() => done() );
      });

      it('should not add a new player connection', function () {
        expect(connectedCount(save1.id)).toEqual(3);
      });
    });
  });

  describe('when a second player connects', function () {
    beforeEach(function (done) {
      getByDevice.returns(Bluebird.resolve([{id: 1}]));

      onClientConnect(undefined, player1, save1)
        .then(() => fakeOn.playerGroupChange.reset())
        .then(() => getByDevice.returns(Bluebird.resolve([{id: 2}])))
        .then(() => onClientConnect(undefined, player2, save1))
        .then(() => done())
        .catch(() => done());
    });

    it('should publish the players and their status in the game', function () {
      expect(fakeOn.playerGroupChange.firstCall.args).toEqual([[{ number: 1, status: 'online', playerId: 1, devices: [1], onSameSubnet: true}, {number: 2, status: 'online', playerId: 2, devices: [2], onSameSubnet: true}, {number: 3, status: 'not-joined', devices: []}], 1]);
    });
  });

  describe('when the number of connected players gets above the minimum', function () {
    it('should set waitingForPlayers to false', function (done) {
      onClientConnect(undefined, player1, save1)
        .then(result => {
          expect(result).toEqual(['ensemble.waitingForPlayers', true]);
        })
        .then(() => onClientConnect(undefined, player2, save1) )
        .then(result => {
          expect(result).toEqual(['ensemble.waitingForPlayers', false]);
        })
        .then(() => done())
        .catch(() => done() );
    });
  });

  describe('when the number of connected players falls below the minimum', function () {
    it('should set waitingForPlayers to true', function (done) {
      onClientConnect(undefined, player1, save1)
        .then(result => {
          expect(result).toEqual(['ensemble.waitingForPlayers', true]);
        })
        .then(() => onClientConnect(undefined, player2, save1) )
        .then(result => {
          expect(result).toEqual(['ensemble.waitingForPlayers', false]);
        })
        .then(() => onClientDisconnect(undefined, player2, save1) )
        .then(result => {
          expect(result).toEqual(['ensemble.waitingForPlayers', true]);
        })
        .then(() => done())
        .catch(() => done());
    });
  });

  describe('connectedCount', function () {
    it('should count the number of online player connections', done => {
      onClientConnect(undefined, player1, save1)
        .then(() => onClientConnect(undefined, player2, save1) )
        .then(() => expect(connectedCount(save1.id)).toEqual(2))
        .then(() => done() )
        .catch(() => done() );
    });

    it('should keep each games player count separate', done => {
      onClientConnect(undefined, player1, save1)
        .then(() => onClientConnect(undefined, player1, save2))
        .then(() => onClientConnect(undefined, player2, save2))
        .then(() => {
          expect(connectedCount(save1.id)).toEqual(1);
          expect(connectedCount(save2.id)).toEqual(2);
        })
        .then(() => done() )
        .catch(() => done() );
    });
  });
});