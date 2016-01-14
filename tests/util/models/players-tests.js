'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
import {logger} from '../../../src/logging/server/logger';
var players = require('../../../src/util/models/players');

describe('the player model', () => {
  beforeEach(done => {
    mongo
      .connect()
      .then(() => { return mongo.removeAll('players'); })
      .then(() => { return mongo.removeAll('player_devices'); })
      .then(done)
      .catch(done);
  });

  afterEach(() => {
    mongo.disconnect();
  });


  describe('getById', () => {
    beforeEach(done => {
      mongo.store('players', {
        _id: 2,
        herp: 'derp'
      })
      .then(() => {
        done();
      });
    });

    it('should return the record', done => {
      players.getById(2).then(function (save) {
        expect(save).toEqual({ _id: 2, herp: 'derp'});
      })
      .then(done).catch(done);
    });
  });

  describe('getByDevice', () => {
    beforeEach(done => {
      mongo.store('players', { _id: 'p1234' })
      .then(() => {
        mongo.store('player_devices', {
          _id: 'pd1234', playerId: 'p1234', deviceId: 'd1234'
        });
      })
      .then(() => { done(); });
    });

    it('should return all players with that device', done => {
      players.getByDevice('d1234').then(players => {
        expect(players.length).toEqual(1);
        expect(players).toEqual([{ _id: 'p1234'}]);
      })
      .then(done).catch(done);
    });
  });

  describe('getByKey', () => {
    beforeEach(done => {
      mongo.store('players', {
        _id: 3,
        key: 'aaaa',
        keyType: 'sessionId'
      })
      .then(() => {
        done();
      });
    });

    it('should return the record', done => {
      players.getByKey('aaaa', 'sessionId').then(function (save) {
        expect(save).toEqual({ _id: 3, key: 'aaaa', keyType: 'sessionId'});
      })
      .then(done).catch(done);
    });
  });

  describe('save', () => {
    beforeEach(() => {
      sinon.spy(logger, 'error');
    });

    afterEach(() => {
      logger.error.restore();
    });

    it('should report an error if there is nothing to save', () => {
      players.save(undefined, 0);

      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no timestamp', () => {
      players.save({id: 1}, undefined);

      expect(logger.error.called).toBe(true);
    });

    it('should save the record', done => {
      players.save({_id: 3, herp: 'derp'}, 15).then(() => {
        return players.getById(3);
      })
      .then(function (save) {
        expect(save.herp).toEqual('derp');
      })
      .then(done).catch(done);
    });

    it('should update the timestamp', done => {
      players.save({_id: 3}, 15).then(() => {
        return players.getById(3);
      })
      .then(function (save) {
        expect(save.updated).toEqual(15);
      })
      .then(done).catch(done);
    });
  });
});