'use strict';

import sinon from 'sinon';
import expect from 'expect';
import {makeTestible} from '../../support';
import {getById} from '../../../src/util/models/devices';
import * as database from '../../../src/util/database';
import * as fakeTime from '../../fake/time';
import {logger} from '../../../src/logging/server/logger';
import {bootstrap, strapboot} from 'ensemblejs-couch-bootstrap';

let time = fakeTime.at(34);

describe('determining the device', () => {
  let determineDeviceId;

  beforeEach(done => {
    let middleware = makeTestible('middleware/server/identifying-players-and-devices', {
        Time: time
    });

    bootstrap(database).finally(() => done());

    determineDeviceId = middleware[1].WebServerMiddleware[0]();
  });

  afterEach(done => {
    strapboot(database).finally(() => done());
  });

  describe('when there is no sessionId', () => {
    var req = {id: 1};
    var send = sinon.spy();
    var res = {
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

    it('should return a 500', () => {
      determineDeviceId(req, res, () => {
        expect(res.status.firstCall.args).toEqual([500]);
        expect(send.called).toBe(true);
      });
    });

    it('should report an error', () => {
      determineDeviceId(req, res, () => {
        expect(logger.error.called).toBe(true);
      });
    });
  });

  describe('when the sessionId is not associated with a device', () => {
    var res = {};

    it('should register the device', done => {
      var req = {sessionID: 's1234'};

      determineDeviceId(req, res, () => {
        getById('s1234')
          .then(device => {
            expect(device.id = 's1234');
          })
          .then(done);
      });
    });

    it('should set the device on the request', done => {
      var req = {sessionID: 's1234'};

      determineDeviceId(req, res, () => {
        expect(req.device.id).toEqual('s1234');
        expect(req.device.updated).toEqual(34);
        done();
      });
    });
  });

  describe('when the sessionId is associated with a device', () => {
    beforeEach(done => {
      database.store('devices', {
        id: 's3434',
        updated: 3434
      })
      .then(() => done());
    });

    it('should set the device on the request', (done) => {
      var req = {sessionID: 's3434'};

      determineDeviceId(req, {}, () => {
        expect(req.device.id).toEqual('s3434');
        expect(req.device.updated).toEqual(3434);
        done();
      });
    });
  });
});