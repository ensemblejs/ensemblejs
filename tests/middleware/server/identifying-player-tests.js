'use strict';

import expect from 'expect';
import sinon from 'sinon';
import mongo from '../../../src/util/mongo';
import {logger} from '../../../src/logging/server/logger';
import {makeTestible, defer} from '../../support';
import * as fakeTime from '../../fake/time';
import {getById, getByDevice} from '../../../src/util/models/players';
let time = fakeTime.at(323);
var uuid = {
  gen: () => { return 'p1234'; }
};

describe('identifying the player', function () {
  let determinePlayerId;

  beforeEach(done => {
    let middleware = makeTestible('middleware/server/identifying-players-and-devices', {
        Time: time
    });

    mongo
      .connect()
      .then(() => { return mongo.removeAll('devices'); })
      .then(() => { return mongo.removeAll('players'); })
      .then(() => { return mongo.removeAll('player_devices'); })
      .finally(done);

    determinePlayerId = middleware[1].WebServiceMiddleware[1](defer(uuid));
  });

  afterEach(() => {
    mongo.disconnect();
  });

  describe('when there is no device id', function () {
    let req = { device: {}};
    let send = sinon.spy();
    let res = {
      status: function() {
        return {
          send: send
        };
      }
    };

    beforeEach( () => {
      sinon.spy(res, 'status');
      sinon.spy(logger, 'error');
    });

    afterEach(() => {
      res.status.restore();
      logger.error.restore();
    });

    it('should report an error', () => {
      determinePlayerId(req, res, () => {
        expect(logger.error.called).toBe(true);
      });
    });

    it('return a 500', () => {
      determinePlayerId(req, res, () => {
        expect(res.status.firstCall.args).toEqual([500]);
        expect(send.called).toBe(true);
      });
    });
  });

  describe('when there is a device id', function () {
    let req = { device: {_id: 'd1234'} };

    describe('when the device is not associated with any player', function () {
      let res = {};

      it('should create a new player', done => {
        determinePlayerId(req, res, () => {
          getById('p1234')
          .then( player => { expect(player._id).toEqual('p1234'); })
          .then(done).catch(done);
        });
      });

      it('should associate the player and the device', done => {
        determinePlayerId(req, res, () => {
          getByDevice('d1234')
          .then(players => {
            expect(players.length).toEqual(1);
            expect(players[0]._id).toEqual('p1234');
          })
          .then(done).catch(done);
        });
      });

      it('should set the player on the request', done => {
        determinePlayerId(req, res, () => {
          expect(req.player).toEqual({_id: 'p1234', updated: 323});
          done();
        }).catch(done);
      });
    });

    describe('when the device is associated with a player', function () {
      let req = { device: {_id: 'd1234'} };
      let res = {};

      beforeEach(done => {
        mongo.store('devices', { _id: 'd1234' })
        .then(() => { mongo.store('players', { _id: 'p1234' }); })
        .then(() => { mongo.store('player_devices', {
          _id: 'pd1234',
          deviceId: 'd1234',
          playerId: 'p1234'
        });})
        .then(() => { done(); });
      });

      it('should set the player on the request', done => {
        determinePlayerId(req, res, () => {
          expect(req.player).toEqual({_id: 'p1234'});
          done();
        }).catch(done);
      });
    });

    describe('when the device is associated with more than one player', function () {
      let req = { device: {_id: 'd1234'} };
      let send = sinon.spy();
      let res = {
        status: function() {
          return {
            send: send
          };
        }
      };

      beforeEach(done => {
        sinon.spy(res, 'status');
        sinon.spy(logger, 'error');

        mongo.store('devices', { _id: 'd1234' })
        .then(() => { mongo.store('players', { _id: 'p1234' }); })
        .then(() => { mongo.store('players', { _id: 'p5678' }); })
        .then(() => { mongo.store('player_devices', {
          _id: '2384756293478',
          deviceId: 'd1234',
          playerId: 'p1234'
        });})
        .then(() => { mongo.store('player_devices', {
          _id: '0823475692',
          deviceId: 'd1234',
          playerId: 'p5678'
        });})
        .then(() => { done(); });
      });

      afterEach(() => {
        res.status.restore();
        logger.error.restore();
      });

      it('should report an error', () => {
        determinePlayerId(req, res, () => {
          expect(logger.error.called).toBe(true);
        });
      });

      it('return a 500', () => {
        determinePlayerId(req, res, () => {
          expect(res.status.firstCall.args).toEqual([500]);
          expect(send.called).toBe(true);
        });
      });
    });
  });
});
