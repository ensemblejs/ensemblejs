'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
var config = require('../../../src/util/config');
var logger = require('../../../src/logging/server/logger').logger;
var players = require('../../../src/util/models/players');

describe('the player model', function () {
  beforeEach(function (done) {
    mongo
      .connect(config.get().mongo.endpoint)
      .then(function () {
        return mongo.removeAll('players');
      })
      .then(done)
      .catch(done);
  });

  afterEach(function () {
    mongo.disconnect();
  });


  describe('getById', function () {
    beforeEach(function (done) {
      mongo.store('players', {
        _id: 2,
        herp: 'derp'
      })
      .then(function () {
        done();
      });
    });

    it('should return the record', function (done) {
      players.getById(2).then(function (save) {
        expect(save).toEqual({ _id: 2, herp: 'derp'});
      })
      .then(done).catch(done);
    });
  });

  describe('getByKey', function () {
    beforeEach(function (done) {
      mongo.store('players', {
        _id: 3,
        key: 'aaaa',
        keyType: 'sessionId'
      })
      .then(function () {
        done();
      });
    });

    it('should return the record', function (done) {
      players.getByKey('aaaa', 'sessionId').then(function (save) {
        expect(save).toEqual({ _id: 3, key: 'aaaa', keyType: 'sessionId'});
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
      players.save(undefined, 0);

      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no timestamp', function () {
      players.save(undefined, 0);

      expect(logger.error.called).toBe(true);
    });

    it('should save the record', function (done) {
      players.save({_id: 3, herp: 'derp'}, 15).then(function () {
        return players.getById(3);
      })
      .then(function (save) {
        expect(save.herp).toEqual('derp');
      })
      .then(done).catch(done);
    });

    it('should update the timestamp', function (done) {
      players.save({_id: 3}, 15).then(function () {
        return players.getById(3);
      })
      .then(function (save) {
        expect(save.updated).toEqual(15);
      })
      .then(done).catch(done);
    });
  });
});