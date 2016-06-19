'use strict';

var sinon = require('sinon');
var expect = require('expect');
var logger = require('../../../src/logging/server/logger').logger;
logger = require('../../../src/logging/shared/logger').setupLogger(logger);
var makeTestible = require('../../support').makeTestible;

describe('meaningful random numbers', function () {
  var meaningfulRandon;

  beforeEach(function () {
    sinon.stub(logger, 'ensureNotNull').returns(undefined);

    var sut = makeTestible('core/server/meaningful-random');

    meaningfulRandon = sut[0];
  });

  afterEach(function () {
    logger.ensureNotNull.restore();
  });

  describe('setup', function () {
    beforeEach(function () {
      meaningfulRandon.setup(4);
    });

    it('should report an error if no seed supplied', function () {
      expect(logger.ensureNotNull.called).toBe(true);
    });
  });

  describe('getting a number', function () {
    var state = { ensemble: { randomSeed: 4 }};
    var res;

    beforeEach(function () {
      meaningfulRandon.setup(4);
      res = meaningfulRandon.number(state);
    });

    it('should return a number', function () {
      expect(res).toBeGreaterThan(0);
      expect(res).toBeLessThan(1);
    });
  });
});