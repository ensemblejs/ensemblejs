'use strict';

import expect from 'expect';
import sinon from 'sinon';
import * as database from '../../../../src/util/database';
import {logger} from '../../../../src/logging/server/logger';
import {makeTestible, defer} from '../../../support';
import * as fakeTime from '../../../fake/time';
import {getById, getByDevice} from '../../../../src/util/models/players';
import {bootstrap, strapboot} from 'ensemblejs-couch-bootstrap';

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

    determinePlayerId = middleware[1].WebServerMiddleware[1](defer(uuid));

    bootstrap(database).finally(() => done());
  });

  afterEach(done => {
    strapboot(database).finally(() => done());
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
    let req = { device: {id: 'd1234'} };

    describe('when the device is not associated with any player', function () {
      let res = {};

      it('should create a new player', done => {
        determinePlayerId(req, res, () => {
          getById('p1234')
            .then(player => { expect(player.id).toEqual('p1234'); })
            .then(done).catch(done);
        });
      });

      it('should associate the player and the device', done => {
        determinePlayerId(req, res, () => {
          getByDevice('d1234')
            .then(players => {
              expect(players.length).toEqual(1);
              expect(players[0].id).toEqual('p1234');
            })
            .then(done).catch(done);
        });
      });

      it('should set the player on the request', done => {
        determinePlayerId(req, res, () => {
          expect(req.player.id).toEqual('p1234');
          expect(req.player.deviceIds).toEqual(['d1234']);
          expect(req.player.updated).toEqual(323);
          done();
        }).catch(done);
      });
    });

    describe('when the device is associated with a player', function () {
      let req = { device: {id: 'd1234'} };
      let res = {};

      beforeEach(done => {
        database.store('devices', { id: 'd1234' })
        .then(() => { database.store('players', {
          id: 'p1234', deviceIds: ['d1234']
        }); })
        .then(() => { done(); });
      });

      it('should set the player on the request', done => {
        determinePlayerId(req, res, () => {
          expect(req.player.id).toEqual('p1234');
          expect(req.player.deviceIds).toEqual(['d1234']);
          done();
        }).catch(done);
      });
    });

    describe('when the device is associated with more than one player', function () {
      let req = { device: {id: 'd1234'} };
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

        database.store('devices', { id: 'd1234' })
        .then(() => { database.store('players', {
          id: 'p1234', deviceIds: ['d1234'] });
        })
        .then(() => { database.store('players', {
          id: 'p5678', deviceIds: ['d1234']
        }); })
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
