'use strict';

var expect = require('expect');
var makeTestible = require('../support').makeTestible;
var logger = require('../fake/logger');

function empty () {}

describe('collision map validator', function () {
  function makeValidator(map) {
    return makeTestible('validators/server/collision-maps', {
      CollisionMap: [map],
      Logger: logger
    })[0];
  }

  beforeEach(function () {
    logger.error.reset();
  });

  it('runs on server start', function () {
    expect(require('../../src/validators/server/collision-maps').type).toEqual('OnServerStart');
  });

  it('should ensure every key becomes an array', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(map.key).toBeAn(Array);
  });

  it('should ensure every "and" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(map.key[0].and).toBeAn(Array);
  });

  it('should ensure every "start" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', start: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(map.key[0].start).toBeAn(Array);
  });

  it('should ensure every "during" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', during: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(map.key[0].during).toBeAn(Array);
  });

  it('should ensure every "finish" becomes an array', function () {
    var map = ['*', {'key': { and: 'something', finish: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(map.key[0].finish).toBeAn(Array);
  });

  it('must have an "and" key', function () {
    var map = ['*', {'key': { finish: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(logger.error.firstCall.args).toEqual(['CollisionMap "key" is missing "and" property.']);
  });

  it('must must have at least "start", "during" or "finish"', function () {
    var map = ['*', {'key': { and: 'something'}}];
    var validator = makeValidator(map);
    validator();

    expect(logger.error.firstCall.args).toEqual(['CollisionMap "key" requires at least one callback out of "start", "during" and "finish".']);
  });

  it('should validate mode restricted maps', function () {
    var map = ['arcade', {'key': { finish: empty}}];
    var validator = makeValidator(map);
    validator();

    expect(logger.error.firstCall.args).toEqual(['CollisionMap "key" is missing "and" property.']);
  });
});