'use strict';

import expect from 'expect';
import * as database from '../../../src/util/database';
import * as devices from '../../../src/util/models/devices';
import {logger} from '../../../src/logging/server/logger';
import sinon from 'sinon';

describe('devices model', () => {
  beforeEach(done => {
    database.create('devices')
      .then(() => done())
      .catch(done);
  });

  afterEach(done => {
    return database.destroy('devices').then(() => done());
  });

  describe('getById', () => {
    beforeEach(done => {
      database.store('devices', {
        id: '1',
        herp: 'derp'
      })
      .then(() => {
        done();
      });
    });

    it('should return the device', (done) => {
      devices.getById('1').then(device => {
        expect(device.id).toEqual('1');
        expect(device.herp).toEqual('derp');
      }).then(done).catch(done);
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
      devices.save(undefined, 0);

      expect(logger.error.called).toBe(true);
    });

    it('should report an error if there is no timestamp', function () {
      devices.save({id: '1'}, undefined);

      expect(logger.error.called).toBe(true);
    });

    it('should save the record', function (done) {
      devices.save({id: '3', herp: 'derp'}, 15).then(function () {
        return devices.getById('3');
      })
      .then(function (save) {
        expect(save.herp).toEqual('derp');
      })
      .then(done).catch(done);
    });

    it('should update the timestamp', function (done) {
      devices.save({id: '3'}, 15).then(function () {
        return devices.getById('3');
      })
      .then(function (save) {
        expect(save.updated).toEqual(15);
      })
      .then(done).catch(done);
    });
  });
});