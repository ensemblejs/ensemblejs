'use strict';

import expect from 'expect';

import requireInject from 'require-inject';
const logger = require('../fake/logger');
const getter = requireInject.withEmptyCache('../../src/util/config', {
  'lodash/once': (a) => a,
  '../../src/logging/server/logger': { logger }
});

describe('config', function () {
  describe('default behaviour', function () {

    let config;
    beforeEach(function () {
      config = getter.get();

      config.ensemble.minPlayers = 1;
      config.ensemble.maxPlayers = 1;
    });

    it('should return the property as defined in the config', function () {
      expect(config.ensemble.minPlayers).toEqual(1);
    });

    it('should use default database port when environment variables not found', function () {
      expect(config.database.host).toEqual('localhost');
      expect(config.database.port).toEqual('5984');
    });

    describe('when there are multiple games', function () {
      beforeEach(function () {
        config.battle = {
          minPlayers: 2,
          maxPlayers: 4
        };
        config.endless = {
          maxPlayers: 2
        };
        config.invalid = {
          minPlayers: 2
        };
        config.mmo = {
          maxPlayers: 'unlimited'
        };
      });

      it('should allow different game modes to have different min and max player counts', function () {
        expect(config.ensemble.minPlayers).toEqual(1);
        expect(config.ensemble.maxPlayers).toEqual(1);

        expect(config.minPlayers()).toEqual(1);
        expect(config.maxPlayers()).toEqual(1);

        expect(config.minPlayers('arcade')).toEqual(1);
        expect(config.maxPlayers('arcade')).toEqual(1);

        expect(config.minPlayers('battle')).toEqual(2);
        expect(config.maxPlayers('battle')).toEqual(4);

        expect(config.minPlayers('endless')).toEqual(1);
        expect(config.maxPlayers('endless')).toEqual(2);
      });

      it('should support unlimited players', function () {
        expect(config.minPlayers('mmo')).toEqual(1);
        expect(config.maxPlayers('mmo')).toEqual(Number.MAX_VALUE);
      });

      it('should log an error if the minPlayers is more than the maxPlayers', function () {
        console.log(config)
        logger.error.reset();
        expect(config.minPlayers('invalid')).toEqual(2);
        expect(logger.error.firstCall.args).toEqual([{minPlayers: 2, maxPlayers: 1, mode: 'invalid'}, 'The minPlayers value is greater than the maxPlayers for mode.']);

        logger.error.reset();
        expect(config.maxPlayers('invalid')).toEqual(1);
        expect(logger.error.firstCall.args).toEqual([{minPlayers: 2, maxPlayers: 1, mode: 'invalid'}, 'The minPlayers value is greater than the maxPlayers for mode.']);
      });
    });
  });

  describe('environment variable overrides', function () {
    let config;

    beforeEach(function () {
      process.env.DATABASE_HOST = 'env-setting-host';
      process.env.DATABASE_PORT = 'env-setting-port';

      config = getter.get();
    });

    afterEach(function () {
      process.env.DATABASE_HOST = undefined;
      process.env.DATABASE_PORT = undefined;
    });

    it('should use database port and host from environment variables if found', function () {
      expect(config.database.host).toEqual('env-setting-host');
      expect(config.database.port).toEqual('env-setting-port');
    });
  });
});
