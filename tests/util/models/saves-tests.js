'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
var config = require('../../../src/util/config');
var logger = require('../../../src/logging/server/logger').logger;
var saves = require('../../../src/util/models/saves');

describe('save model', function () {
  beforeEach(function (done) {
    mongo
      .connect(config.get().mongo.endpoint)
      .then(function () {
        return mongo.removeAll('saves');
      })
      .finally(done);
  });

  afterEach(function () {
    mongo.disconnect();
  });

  describe('get by game', function () {
    beforeEach(function (done) {
      mongo.store('saves', {
        _id: 1,
        ensemble: { gameId: 'ensemble+fun', mode: 'arcade'}
      })
      .then(function () {
        done();
      });
    });

    it('should return a summary of all saves for the game', function (done) {
      saves.getByGame('ensemble+fun').then(function (saves) {
        expect(saves.length).toEqual(1);
        expect(saves[0].id).toEqual(1);
        expect(saves[0].mode).toEqual('arcade');
      })
      .then(done).catch(done);
    });
  });

  describe('get by id', function () {
    beforeEach(function (done) {
      mongo.store('saves', {
        _id: 2,
        ensemble: {}
      })
      .then(function () {
        done();
      });
    });

    it('should return the save identified by the id', function (done) {
      saves.getById(2).then(function (save) {
        expect(save).toEqual({ _id: 2, ensemble: {}});
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
      saves.save(undefined, 0);

      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no timestamp', function () {
      saves.save({}, undefined);

      expect(logger.error.called).toBe(true);
    });

    it('should set the id to the ensemble save id if not set', function (done) {
      saves.save({ensemble: {saveId: 1}}, 15).then(function () {
        return saves.getById(1);
      })
      .then(function (save) {
        expect(save._id).toEqual(1);
      })
      .then(done).catch(done);
    });

    it('should set the updated time to the timestamp', function (done) {
      saves.save({ensemble: {saveId: 1}}, 15).then(function () {
        return saves.getById(1);
      })
      .then(function (save) {
        expect(save.updated).toEqual(15);
      })
      .then(done).catch(done);
    });
  });

  describe('isPublic', function () {
    beforeEach(function (done) {
      mongo.store('saves', {
        _id: 3,
        ensemble: { secret: 'public'}
      })
      .then(function () {
        return mongo.store('saves', {
          _id: 4,
          ensemble: { secret: ''}
        });
      }).then(function () {
        return mongo.store('saves', {
          _id: 5,
          ensemble: { secret: 'something'}
        });
      })
      .then(function () {
        done();
      });
    });

    it('should return true if the game secret is "public"', function (done) {
      saves.isPublic(3).then(function (isPublic) {
        expect(isPublic).toEqual(true);
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      saves.isPublic(4).then(function (isPublic) {
        expect(isPublic).toEqual(false);
      })
      .then(done).catch(done);
    });

    it('should return false if secret is blank', function (done) {
      saves.isPublic(5).then(function (isPublic) {
        expect(isPublic).toEqual(false);
      })
      .then(done).catch(done);
    });
  });

  describe('isSecretCorrect', function () {
    beforeEach(function (done) {
      mongo.store('saves', {
        _id: 6,
        ensemble: { secret: 'matches'}
      })
      .then(function () {
        return mongo.store('saves', {
          _id: 7,
          ensemble: { secret: 'MaTcHeS'}
        });
      })
      .then(function () {
        done();
      });
    });

    it('should return true if the supplied secret matches the save secret', function (done) {
      saves.isSecretCorrect(6, 'matches').then(function (correct) {
        expect(correct).toEqual(true);
      })
      .then(done).catch(done);
    });

    it('should ignore case', function (done) {
      saves.isSecretCorrect(6, 'MATCHES').then(function (correct) {
        expect(correct).toEqual(true);
      }).then(function () {
        return saves.isSecretCorrect(7, 'MATCHES').then(function (correct) {
          expect(correct).toEqual(true);
        });
      })
      .then(done).catch(done);
    });

    it('should return false otherwise', function (done) {
      saves.isSecretCorrect(6, 'public').then(function (correct) {
        expect(correct).toEqual(false);
      })
      .then(done).catch(done);
    });
  });
});