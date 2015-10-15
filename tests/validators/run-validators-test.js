'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../support').makeTestible;

describe('running validators', function () {
  var runner;
  var validator = sinon.spy();

  beforeEach(function () {
    runner = makeTestible('validators/server/run-validators', {
      Validator: [validator]
    });

    runner[0]();
  });

  it('should run on server start', function () {
    expect(require('../../src/validators/server/run-validators').type).toEqual('OnServerStart');
  });

  it('should call each validator', function () {
    expect(validator.called).toBe(true);
  });
});