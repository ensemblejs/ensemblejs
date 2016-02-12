'use strict';

var expect = require('expect');
var sinon = require('sinon');
import * as database from '../../../src/util/database';
import {logger} from '../../../src/logging/server/logger';
var players = require('../../../src/util/models/players');

describe('the player model', () => {
  beforeEach(done => {
    database.create('players')
      .then(() => database.createView('players', {
        language: 'javascript',
        views: {
          all: {
            map: 'function(doc) { emit(null, doc) }'
          },
          byDevice: {
            map: 'function(doc) { if (doc.deviceIds.length > 0) { for(var i in doc.deviceIds) { emit(doc.deviceIds[i], doc); } } }'
          }
        }
      }))
      .then(() => done());
  });

  afterEach(done => {
    database.destroy('players').then(() => done());
  });

  describe('getById', () => {
    beforeEach(done => {
      database.store('players', {
        id: '2',
        herp: 'derp'
      })
      .then(() => {
        done();
      });
    });

    it('should return the record', done => {
      players.getById('2').then(function (save) {
        expect(save.id).toEqual('2');
        expect(save.herp).toEqual('derp');
      })
      .then(done).catch(done);
    });
  });

  describe('getByDevice', () => {
    beforeEach(done => {
      database
        .store('players', { id: 'p1234',  deviceIds: ['d1234'] })
        .then(() => { done(); });
    });

    it('should return all players with that device', done => {
      players.getByDevice('d1234').then(players => {
        expect(players.length).toEqual(1);
        expect(players[0].id).toEqual('p1234');
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
      players.save({id: '1'}, undefined);

      expect(logger.error.called).toBe(true);
    });

    it('should save the record', done => {
      players.save({id: '3', herp: 'derp'}, 15).then(() => {
        return players.getById('3');
      })
      .then(function (save) {
        expect(save.herp).toEqual('derp');
      })
      .then(done).catch(done);
    });

    it('should update the timestamp', done => {
      players.save({id: '3'}, 15).then(() => {
        return players.getById('3');
      })
      .then(function (save) {
        expect(save.updated).toEqual(15);
      })
      .then(done).catch(done);
    });
  });
});