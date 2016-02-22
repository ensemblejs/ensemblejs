'use strict';

var expect = require('expect');
var sinon = require('sinon');

var callback = sinon.spy();

var plugin = require('../../../src/events/shared/interval-server-side-update').func();

describe('callbacks every interval', function () {
  beforeEach(function () {
    callback.reset();
  });

  it('should call the function every n milliseconds', function () {
    var update = plugin(callback).every(15).milliseconds();
    update(0.005, undefined);
    expect(callback.callCount).toBe(0);
    update(0.01, undefined);
    expect(callback.callCount).toBe(1);
    update(0.01, undefined);
    expect(callback.callCount).toBe(1);
    update(0.01, undefined);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function every n seconds', function () {
    var update = plugin(callback).every(2).seconds();
    update(1.9, undefined);
    expect(callback.callCount).toBe(0);
    update(0.1, undefined);
    expect(callback.callCount).toBe(1);
    update(2, undefined);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function every n minutes', function () {
    var update = plugin(callback).every(1).minute();
    update(59.999, undefined);
    expect(callback.callCount).toBe(0);
    update(0.001, undefined);
    expect(callback.callCount).toBe(1);
    update(60, undefined);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function every n hours', function () {
    var update = plugin(callback).every(3).hours();
    update(10799.999, undefined);
    expect(callback.callCount).toBe(0);
    update(0.001, undefined);
    expect(callback.callCount).toBe(1);
    update(10800, undefined);
    expect(callback.callCount).toBe(2);
  });
});

describe('callbacks about n times an interval', function () {
  beforeEach(function () {
    callback.reset();
  });

  it('should call the function n times a second', function () {
    var update = plugin(callback).about(5).timesPer.second();
    update(0.199, undefined);
    expect(callback.callCount).toBe(0);
    update(0.001, undefined);
    expect(callback.callCount).toBe(1);
    update(0.200, undefined);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function n times a minute', function () {
    var update = plugin(callback).about(5).timesPer.minute();
    update(11.999, undefined);
    expect(callback.callCount).toBe(0);
    update(0.001, undefined);
    expect(callback.callCount).toBe(1);
    update(12, undefined);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function n times an hour', function () {
    var update = plugin(callback).about(5).timesPer.hour();
    update(719.999, undefined);
    expect(callback.callCount).toBe(0);
    update(0.001, undefined);
    expect(callback.callCount).toBe(1);
    update(720, undefined);
    expect(callback.callCount).toBe(2);
  });
});