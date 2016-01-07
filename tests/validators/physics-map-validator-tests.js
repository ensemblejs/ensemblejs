'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../support').makeTestible;
var logger = require('../../src/logging/server/logger').logger;

describe('physics map validator', function () {
  function makeValidator(map) {
    return makeTestible('validators/shared/physics-map', {
      PhysicsMap: [map],
      Logger: logger
    })[1];
  }

  beforeEach(function () {
    sinon.spy(logger, 'error');
  });

  afterEach(function () {
    logger.error.restore();
  });

  it('runs on server start', function () {
    expect(makeValidator({}).OnServerStart).toNotBe(undefined);
  });

  it('runs on client start', function () {
    expect(makeValidator({}).OnClientStart).toNotBe(undefined);
  });

  it('should ensure every key becomes an array', function () {
    var map = ['*', {'key': 'somethng'}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key).toBeAn(Array);
    expect(logger.error.callCount).toEqual(0);
  });

  it('should require at least one entry per array', function () {
    var map = ['*', {'key': []}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(logger.error.firstCall.args).toEqual([{key: 'key'}, 'PhysicsMap entry must have at least one entry.']);
    expect(logger.error.callCount).toEqual(1);
  });

  it('should allow strings or objects in the array', function () {
    var map = ['*', {'key': [1, [], true, 'string', {}]}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(logger.error.firstCall.args).toEqual([{key: 'key'}, 'PhysicsMap entry must have either strings or object sources.']);
    expect(logger.error.callCount).toEqual(3);
  });

  it('should validate mode restricted maps', function () {
    var map = ['*', {'key': []}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(logger.error.firstCall.args).toEqual([{key: 'key'}, 'PhysicsMap entry must have at least one entry.']);
    expect(logger.error.callCount).toEqual(1);
  });
});