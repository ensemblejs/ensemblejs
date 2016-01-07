'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
var config = require('../../../src/util/config');
var logger = require('../../../src/logging/server/logger').logger;
var playersInSave = require('../../../src/util/models/players-in-save');

describe('players in save model', function () {
  beforeEach(function (done) {
    mongo
      .connect(config.get().mongo.endpoint)
      .then(function () {
        return mongo.removeAll('saves');
      })
      .then(function () {
        return mongo.removeAll('players_in_save');
      })
      .then(function () {
        return mongo.store('saves', { _id: 1, ensemble: { secret: 'aaa' }});
      })
      .then(function () {
        return mongo.store('saves', { _id: 2, ensemble: { secret: 'public', mode: 'arcade' }});
      })
      .then(function () {
        done();
      });
  });

  afterEach(function () {
    mongo.disconnect();
  });

  describe('getBySave', function () {
    beforeEach(function (done) {
      mongo.store('players_in_save', { _id: 3, saveId: 1})
        .then(function () {
          return mongo.store('players_in_save', { _id: 4, saveId: 2});
        })
        .then(function () {
          done();
        });
    });

    it('should return all players in the save', function (done) {
      playersInSave.getBySave(1).then(function (players) {
        expect(players.length).toEqual(1);
        expect(players[0]).toEqual({_id: 3, saveId: 1});
      })
      .then(done).catch(done);
    });
  });

  describe('getByGameAndPlayer', function () {
    beforeEach(function (done) {
      mongo.store('players_in_save',
        { _id: 3, saveId: 1, gameId: 5, playerId: 6}
      )
      .then(function () {
        return mongo.store('players_in_save',
          { _id: 4, saveId: 2, gameId: 6, playerId: 7});
      })
      .then(function () {
        done();
      });
    });

    it('should return all the saves for the player for this game', function (done) {
      playersInSave.getByGameAndPlayer(5, 6).then(function (saves) {
        expect(saves.length).toEqual(1);
        expect(saves[0]).toEqual({ _id: 3, saveId: 1, gameId: 5, playerId: 6});
      })
      .then(done).catch(done);
    });
  });

  describe('addPlayer', function () {
    beforeEach(function () {
      sinon.spy(logger, 'error');
    });

    afterEach(function () {
      logger.error.restore();
    });

    it('should add the player to the save', function (done) {
      playersInSave.addPlayer(1, 3, 10, 10)
        .then(function () {
          return playersInSave.getBySave(3);
        })
        .then(function(players) {
          expect(players[0].gameId).toEqual(1);
          expect(players[0].saveId).toEqual(3);
          expect(players[0].playerId).toEqual(10);
        })
        .then(done)
        .catch(done);
    });

    it('should generate an id', function (done) {
      playersInSave.addPlayer(1, 4, 11, 10)
        .then(function () {
          return playersInSave.getBySave(4);
        })
        .then(function(players) {
          expect(players[0]._id).toNotBe(undefined);
        })
        .then(done)
        .catch(done);
    });

    it('should set the updated timestamp', function (done) {
      playersInSave.addPlayer(1, 5, 11, 50)
        .then(function () {
          return playersInSave.getBySave(5);
        })
        .then(function(players) {
          expect(players[0].updated).toEqual(50);
        })
        .then(done)
        .catch(done);
    });

    it('should report an error if there is no gameId', function () {
      playersInSave.addPlayer(undefined, 2, 3, 4);
      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no saveId', function () {
      playersInSave.addPlayer(1, undefined, 3, 4);
      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no playerId', function () {
      playersInSave.addPlayer(1, 2, undefined, 4);
      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no timestamp', function () {
      playersInSave.addPlayer(1, 2, 3, undefined);
      expect(logger.error.called).toBe(true);
    });
  });

  describe('isPlayerInSave', function () {
    beforeEach(function (done) {
      playersInSave.addPlayer(1, 1, 20, 10)
        .then(function() {
          done();
        });
    });

    it('should return true if the player is in the save', function (done) {
      playersInSave.isPlayerInSave(1, 20).then(function (result) {
        expect(result).toBe(true);
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      playersInSave.isPlayerInSave(1, 21).then(function (result) {
        expect(result).toBe(false);
      })
      .then(done).catch(done);
    });
  });

  describe('hasSpaceForPlayer', function () {
    beforeEach(function () {
      sinon.stub(config, 'get').returns({
        maxPlayers: function (mode) { return (mode === 'arcade') ? 3 : 1; }
      });
    });

    afterEach(function () {
      config.get.restore();
    });

    it('should return true if the player count is less than the max player count', function (done) {
      playersInSave.hasSpaceForPlayer(1).then(function(result) {
        expect(result).toBe(true);
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      playersInSave.addPlayer(1, 1, 20, 10)
        .then(function() {
          return playersInSave.hasSpaceForPlayer(1);
        })
        .then(function(result) {
          expect(result).toBe(false);
        })
        .then(done)
        .catch(done);
    });

    it('should use the mode of the save record to determine the max player count', function (done) {
      playersInSave.addPlayer(1, 2, 20, 10)
        .then(function() {
          return playersInSave.hasSpaceForPlayer(2);
        })
        .then(function(result) {
          expect(result).toBe(true);
        })
        .then(done)
        .catch(done);
    });
  });

  describe('canPlayerJoin', function () {
    beforeEach(function () {
      sinon.stub(config, 'get').returns({
        maxPlayers: function () { return 1; }
      });
    });

    afterEach(function () {
      config.get.restore();
    });

    describe('public saves', function () {
      it('should return true if there are spaces in the save', function (done) {
        playersInSave.canPlayerJoin(2, 20)
          .then(function (result) {
            expect(result).toBe(true);
          })
          .then(done)
          .catch(done);
      });

      it('should return false otherwise', function (done) {
         playersInSave.addPlayer(1, 2, 21, 10)
          .then(function() {
            return playersInSave.canPlayerJoin(2, 20);
          })
          .then(function (result) {
            expect(result).toBe(false);
          })
          .then(done)
          .catch(done);
      });
    });

    describe('private saves', function () {
      it('should return false', function (done) {
        playersInSave.canPlayerJoin(1, 20)
          .then(function (result) {
            expect(result).toBe(false);
          })
          .then(done).catch(done);
      });
    });
  });

});