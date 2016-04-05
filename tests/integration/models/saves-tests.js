'use strict';

var expect = require('expect');
var sinon = require('sinon');
import * as database from '../../../src/util/database';
import {summarise} from '../../../src/util/adapters/save-adapter';
var logger = require('../../../src/logging/server/logger').logger;
var saves = require('../../../src/util/models/saves');
var config = require('../../../src/util/config');
import {getById, getByGame, save, isPublic, isSecretCorrect, isAutoAdd} from '../../../src/util/models/saves';
import {bootstrap, strapboot} from 'ensemblejs-couch-bootstrap';

describe('save model', function () {
  this.timeout(5000);

  beforeEach(done => {
    bootstrap(database).finally(() => done());
  });

  afterEach(done => {
    strapboot(database).finally(() => done());
  });

  describe('get by game', function () {
    beforeEach(function (done) {
      database.store('saves', {
        id: '1',
        ensemble: { gameId: 'ensemble+fun', mode: 'arcade'}
      })
      .then(() => done());
    });

    it('should return a summary of all saves for the game', function (done) {
      getByGame('ensemble+fun', summarise).then(saves => {
        expect(saves.length).toEqual(1);
        expect(saves[0].id).toEqual('1');
        expect(saves[0].mode).toEqual('arcade');
      })
      .then(done).catch(done);
    });
  });

  describe('get by id', function () {
    beforeEach(function (done) {
      database.store('saves', {
        id: '2',
        ensemble: {}
      })
      .then(() => done());
    });

    it('should return the save identified by the id', function (done) {
      getById('2').then(function (save) {
        expect(save.id).toEqual('2');
        expect(save.ensemble).toEqual({});
      })
      .then(done).catch(done);
    });
  });

  describe('save', function () {
    beforeEach(function () {
      sinon.spy(logger, 'error');
    });

    afterEach(function () {
      logger.error.restore();
    });

    it('should report an error if there is nothing to save', function () {
      save(undefined, 0);

      expect(logger.error.called).toBe(true);
    });

    it('should set the id to the ensemble save id if not set', function (done) {
      save({ensemble: {saveId: '1'}}).then(function () {
        return saves.getById('1');
      })
      .then(function (save) {
        expect(save.id).toEqual('1');
      })
      .then(done).catch(done);
    });

    it('should set the updated time to the timestamp', function (done) {
      save({ensemble: {saveId: '1'}}).then(function () {
        return saves.getById('1');
      })
      .then(function (save) {
        expect(save.updated).toNotEqual(15);
      })
      .then(done).catch(done);
    });

    it('should create a saves_metadata record');
  });

  describe('isPublic', function () {
    beforeEach(function (done) {
      database.store('saves', {
        id: '3',
        ensemble: { secret: 'public-ask'}
      })
      .then(function () {
        return database.store('saves', {
          id: '6',
          ensemble: { secret: 'public-auto'}
        });
      }).then(function () {
        return database.store('saves', {
          id: '4',
          ensemble: { secret: ''}
        });
      }).then(function () {
        return database.store('saves', {
          id: '5',
          ensemble: { secret: 'something'}
        });
      })
      .then(function () {
        done();
      });
    });

    it('should return true if the game secret is "public-auto"', function (done) {
      isPublic('6').then(function (isPublic) {
        expect(isPublic).toEqual(true);
      })
      .then(done).catch(done);
    });

    it('should return true if the game secret is "public-ask"', function (done) {
      isPublic('3').then(function (isPublic) {
        expect(isPublic).toEqual(true);
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      isPublic('4').then(function (isPublic) {
        expect(isPublic).toEqual(false);
      })
      .then(done).catch(done);
    });

    it('should return false if secret is blank', function (done) {
      isPublic('5').then(function (isPublic) {
        expect(isPublic).toEqual(false);
      })
      .then(done).catch(done);
    });
  });

  describe('isAutoAdd', function () {
    beforeEach(function (done) {
      database.store('saves', {
        id: '3',
        ensemble: { secret: 'public-ask'}
      })
      .then(function () {
        return database.store('saves', {
          id: '6',
          ensemble: { secret: 'public-auto'}
        });
      }).then(function () {
        return database.store('saves', {
          id: '4',
          ensemble: { secret: ''}
        });
      }).then(function () {
        return database.store('saves', {
          id: '5',
          ensemble: { secret: 'something'}
        });
      })
      .then(function () {
        done();
      });
    });

    it('should return false if the game secret is "public-ask"', function (done) {
      isAutoAdd('3').then(function (isAutoAdd) {
        expect(isAutoAdd).toEqual(false);
      })
      .then(done).catch(done);
    });

    it('should return true if the game secret is "public-auto"', function (done) {
      isAutoAdd('6').then(function (isAutoAdd) {
        expect(isAutoAdd).toEqual(true);
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      isAutoAdd('4').then(function (isAutoAdd) {
        expect(isAutoAdd).toEqual(false);
      })
      .then(done).catch(done);
    });

    it('should return false if secret is blank', function (done) {
      isAutoAdd('5').then(function (isAutoAdd) {
        expect(isAutoAdd).toEqual(false);
      })
      .then(done).catch(done);
    });
  });

  describe('isSecretCorrect', function () {
    beforeEach(function (done) {
      database.store('saves', {
        id: '6',
        ensemble: { secret: 'matches'}
      })
      .then(function () {
        return database.store('saves', {
          id: '7',
          ensemble: { secret: 'MaTcHeS'}
        });
      })
      .then(function () {
        done();
      });
    });

    it('should return true if the supplied secret matches the save secret', function (done) {
      isSecretCorrect('6', 'matches').then(function (correct) {
        expect(correct).toEqual(true);
      })
      .then(done).catch(done);
    });

    it('should ignore case', function (done) {
      isSecretCorrect('6', 'MATCHES').then(function (correct) {
        expect(correct).toEqual(true);
      }).then(function () {
        return isSecretCorrect('7', 'MATCHES').then(function (correct) {
          expect(correct).toEqual(true);
        });
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      isSecretCorrect('6', 'public').then(function (correct) {
        expect(correct).toEqual(false);
      })
      .then(done).catch(done);
    });
  });

  describe('getByGameAndPlayer', function () {
    beforeEach(function (done) {
      database.store('saves_metadata', {
        id: '1', gameId: '5', playerIds: ['6', '7']
      })
      .then(() => database.store('saves_metadata', {
        id: '2', gameId: '6', playerIds: ['7']
      }))
      .then(() => done());
    });

    it('should return all the saves for the player for this game', function (done) {
      saves.getByGameAndPlayer('5', '6')
        .then(saves => {
          expect(saves.length).toEqual(1);
          expect(saves[0].id).toEqual('1');
          expect(saves[0].gameId).toEqual('5');
          expect(saves[0].playerIds).toEqual(['6', '7']);
        })
        .then(done)
        .catch(done);
    });
  });

  describe('addPlayer', function () {
    beforeEach(function (done) {
      sinon.spy(logger, 'error');

      sinon.stub(config, 'get').returns({
        maxPlayers: function () { return 2;}
      });

      database.store('saves_metadata', {
        id: '3', gameId: '5', playerIds: [], updated: 0
      }).then(() => done());
    });

    afterEach(function () {
      logger.error.restore();
      config.get.restore();
    });

    it('should add the player to the save', function (done) {
      saves.addPlayer('3', '10', 10)
        .then(() => saves.isPlayerInSave('3', '10'))
        .then(result => expect(result).toBe(true))
        .then(() => done())
        .catch(done);
    });

    it('should not add the same player twice', function (done) {
      saves.addPlayer('3', '10', 10)
        .then(() => saves.isPlayerInSave('3', '10'))
        .then(result => expect(result).toBe(true))
        .then(() => saves.addPlayer('3', '10', 10))
        .then(() => saves.addPlayer('3', '10', 10))
        .then(() => saves.addPlayer('3', '10', 10))
        .then(() => saves.hasSpaceForPlayer('3'))
        .then(result => expect(result).toBe(true))
        .then(() => done())
        .catch(done);
    });

    it('should report an error if there is no saveId', function () {
      saves.addPlayer(undefined, 3, 4);
      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no playerId', function () {
      saves.addPlayer(2, undefined, 4);
      expect(logger.error.called).toBe(true);
    });
  });

  describe('isPlayerInSave', function () {
    beforeEach(done => {
      database.store('saves_metadata', {
        id: '1',
        playerIds: []
      })
      .then(() => saves.addPlayer('1', '20', 10))
      .then(() => done());
    });

    it('should return true if the player is in the save', function (done) {
      saves.isPlayerInSave('1', '20')
        .then(result => expect(result).toBe(true))
        .then(() => done()).catch(done);
    });

    it('should return false otherwise', function (done) {
      saves.isPlayerInSave('1', '21')
        .then(result => expect(result).toBe(false))
        .then(() => done()).catch(done);
    });
  });

  describe('hasSpaceForPlayer', function () {
    beforeEach(done => {
      sinon.stub(config, 'get').returns({
        maxPlayers: function (mode) { return (mode === 'arcade') ? 3 : 1; }
      });

      save({ensemble: {saveId: '1', mode: 'default'}})
        .then(() => save({ensemble: {saveId: '2', mode: 'arcade'}}))
        .then(() => done());
    });

    afterEach(() => {
      config.get.restore();
    });

    it('should return true if the player count is less than the max player count', function (done) {
      saves.hasSpaceForPlayer('1')
        .then(result => { expect(result).toBe(true); })
        .then(done)
        .catch(done);
    });

    it('should return false otherwise', function (done) {
      saves.addPlayer('1', '20', 10)
        .then(() => saves.hasSpaceForPlayer('1'))
        .then(result => { expect(result).toBe(false); })
        .then(done)
        .catch(done);
    });

    it('should use the mode of the save record to determine the max player count', function (done) {
      saves.addPlayer('2', '20', 10)
        .then(() => saves.hasSpaceForPlayer('2'))
        .then(result => { expect(result).toBe(true); })
        .then(done)
        .catch(done);
    });
  });

  describe('canPlayerJoin', function () {
    beforeEach(done => {
      sinon.stub(config, 'get').returns({
        maxPlayers: function () { return 1; }
      });

      save({ensemble: {saveId: '1', mode: 'default', secret: 'private'}})
        .then(() => save({ensemble: {saveId: '2', mode: 'arcade', secret: 'public'}}))
        .then(() => done());
    });

    afterEach(function () {
      config.get.restore();
    });

    describe('public saves', function () {
      it('should return true if there are spaces in the save', function (done) {
        saves.canPlayerJoin('2')
          .then(result => { expect(result).toBe(true); })
          .then(done)
          .catch(done);
      });

      it('should return false otherwise', function (done) {
         saves.addPlayer('2', '21', 10)
          .then(() => saves.canPlayerJoin('2'))
          .then(result => { expect(result).toBe(false); })
          .then(done)
          .catch(done);
      });
    });

    describe('private saves', function () {
      it('should return false', function (done) {
        saves.canPlayerJoin('1')
          .then(result => { expect(result).toBe(false); })
          .then(done).catch(done);
      });
    });
  });
});