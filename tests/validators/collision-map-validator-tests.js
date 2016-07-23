'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../support').makeTestible;
var logger = require('../../src/logging/server/logger').logger;

function empty () {}

describe('collision map validator', function () {
  function makeValidator(map) {
    return makeTestible('validators/shared/collision-maps', {
      CollisionMap: [map],
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
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key).toBeAn(Array);
  });

  it('should ensure every "and" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].and).toBeAn(Array);
  });

  it('should ensure every "start" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].start).toBeAn(Array);
  });

  it('should not array "start" when not supplied', function () {
    var map = ['*', {'key': { and: 'something', during: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].start).toBe(undefined);
  });

  it('should ensure every "during" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', during: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].during).toBeAn(Array);
  });

  it('should not array "during" when not supplied', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].during).toBe(undefined);
  });

  it('should ensure every "finish" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', finish: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].finish).toBeAn(Array);
  });

  it('should not array "finish" when not supplied', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].finish).toBe(undefined);
  });

  it('should ensure every "data" becomes an array', function () {
    var map = ['*', {'key': { and: 'something'}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(map.key[0].data).toBeAn(Array);
  });

  it('must have an "and" key', function () {
    var map = ['*', {'key': { finish: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(logger.error.firstCall.args).toEqual([{key: 'key', property: 'and'}, 'CollisionMap is missing property.']);
  });

  it('must must have at least "start", "during" or "finish"', function () {
    var map = ['*', {'key': { and: 'something'}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(logger.error.firstCall.args).toEqual([{key: 'key'}, 'CollisionMap requires at least one callback out of "start", "during" and "finish".']);
  });

  it('should validate mode restricted maps', function () {
    var map = ['arcade', {'key': { finish: empty}}];
    var validator = makeValidator(map);
    validator.OnServerStart()();

    expect(logger.error.firstCall.args).toEqual([{key: 'key', property: 'and'}, 'CollisionMap is missing property.']);
  });
});