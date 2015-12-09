'use strict';

var expect = require('expect');
var makeTestible = require('../support').makeTestible;
var logger = require('../fake/logger');

describe('physics map validator', function () {
  function makeValidator(map) {
    return makeTestible('validators/server/physics-map', {
      PhysicsMap: [map],
      Logger: logger
    })[0];
  }

  beforeEach(function () {
    logger.error.reset();
  });

  it('runs on server start', function () {
    expect(require('../../src/validators/server/physics-map').type).toEqual('OnServerStart');
  });

  it('should ensure every key becomes an array', function () {
    var map = ['*', {'key': 'somethng'}];
    var validator = makeValidator(map);
    validator();

    expect(map.key).toBeAn(Array);
    expect(logger.error.callCount).toEqual(0);
  });

  it('should require at least one entry per array', function () {
    var map = ['*', {'key': []}];
    var validator = makeValidator(map);
    validator();

    expect(logger.error.firstCall.args).toEqual(['PhysicsMap entry "key" must have at least one entry.']);
    expect(logger.error.callCount).toEqual(1);
  });

  it('should allow strings or objects in the array', function () {
    var map = ['*', {'key': [1, [], true, 'string', {}]}];
    var validator = makeValidator(map);
    validator();

    expect(logger.error.firstCall.args).toEqual(['PhysicsMap entry "key" must have either strings or object sources.']);
    expect(logger.error.callCount).toEqual(3);
  });

  it('should validate mode restricted maps', function () {
    var map = ['*', {'key': []}];
    var validator = makeValidator(map);
    validator();

    expect(logger.error.firstCall.args).toEqual(['PhysicsMap entry "key" must have at least one entry.']);
    expect(logger.error.callCount).toEqual(1);
  });
});