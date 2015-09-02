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
    update(undefined, 0.005);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.01);
    expect(callback.callCount).toBe(1);
    update(undefined, 0.01);
    expect(callback.callCount).toBe(1);
    update(undefined, 0.01);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function every n seconds', function () {
    var update = plugin(callback).every(2).seconds();
    update(undefined, 1.9);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.1);
    expect(callback.callCount).toBe(1);
    update(undefined, 2);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function every n minutes', function () {
    var update = plugin(callback).every(1).minute();
    update(undefined, 59.999);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.001);
    expect(callback.callCount).toBe(1);
    update(undefined, 60);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function every n hours', function () {
    var update = plugin(callback).every(3).hours();
    update(undefined, 10799.999);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.001);
    expect(callback.callCount).toBe(1);
    update(undefined, 10800);
    expect(callback.callCount).toBe(2);
  });
});

describe('callbacks about n times an interval', function () {
  beforeEach(function () {
    callback.reset();
  });

  it('should call the function n times a second', function () {
    var update = plugin(callback).about(5).timesPer.second();
    update(undefined, 0.199);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.001);
    expect(callback.callCount).toBe(1);
    update(undefined, 0.200);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function n times a minute', function () {
    var update = plugin(callback).about(5).timesPer.minute();
    update(undefined, 11.999);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.001);
    expect(callback.callCount).toBe(1);
    update(undefined, 12);
    expect(callback.callCount).toBe(2);
  });

  it('should call the function n times an hour', function () {
    var update = plugin(callback).about(5).timesPer.hour();
    update(undefined, 719.999);
    expect(callback.callCount).toBe(0);
    update(undefined, 0.001);
    expect(callback.callCount).toBe(1);
    update(undefined, 720);
    expect(callback.callCount).toBe(2);
  });
});