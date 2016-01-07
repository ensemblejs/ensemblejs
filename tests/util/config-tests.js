'use strict';

var expect = require('expect');
var sinon = require('sinon');

var logger = require('../../src/logging/server/logger').logger;
var config = require('../../src/util/config').get();

describe('config', function () {
  beforeEach(function () {
    sinon.spy(logger, 'error');

    config.ensemble.minPlayers = 1;
    config.ensemble.maxPlayers = 1;
  });

  afterEach(function () {
    logger.error.restore();
  });

  it('should return the property as defined in the config', function () {
    expect(config.ensemble.minPlayers).toEqual(1);
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

    it('should log an error if the minPlayers is more than the maxPlayers', function () {
      logger.error.reset();
      expect(config.minPlayers('invalid')).toEqual(2);
      expect(logger.error.firstCall.args).toEqual(['minPlayers for "invalid" (2) is greater than the maxPlayers (1) property.']);

      logger.error.reset();
      expect(config.maxPlayers('invalid')).toEqual(1);
      expect(logger.error.firstCall.args).toEqual(['minPlayers for "invalid" (2) is greater than the maxPlayers (1) property.']);
    });
  });
});