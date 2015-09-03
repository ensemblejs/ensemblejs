'use strict';

var expect = require('expect');
var sinon = require('sinon');
var defer = require('../../support').defer;

var window = {
  requestAnimationFrame: sinon.spy()
};
var on = {
  renderFrame: sinon.spy()
};
var currentState = {
  get: function () { return true; }
};
var updateLoop;
var clock;

function unpauseGame () {
  currentState.get = function () { return false; };
}

var ms = 0;
var time = {
  present: function () { return ms; }
};
 function advanceTime (by) { ms += by; }

describe('the update loop', function () {
  describe('when paused', function () {
    beforeEach(function () {
      updateLoop = require('../../../src/core/client/render').func(defer(window), defer(on), defer(currentState), defer(time));
      updateLoop.run();
    });

    it('it should reschedule itself', function () {
      expect(window.requestAnimationFrame.called).toBe(true);
    });
  });

  describe('when running', function () {
    beforeEach(function () {
      unpauseGame();

      on.renderFrame.reset();

      updateLoop = require('../../../src/core/client/render').func(defer(window), defer(on), defer(currentState), defer(time));
      updateLoop.run();
    });

    it('should reschedule itself', function () {
      expect(window.requestAnimationFrame.called).toBe(true);
    });

    it('should pass frame delta to OnRenderFrame handlers', function () {
      advanceTime(43);
      updateLoop.run();
      expect(on.renderFrame.lastCall.args).toEqual([0.043]);
    });

    it('should consider paused frames when calculating the time since last frame', function() {

      advanceTime(43);
      updateLoop.run();
      unpauseGame();
      advanceTime(23);
      updateLoop.run();

      expect(on.renderFrame.lastCall.args).toEqual([0.023]);
    });
  });
});