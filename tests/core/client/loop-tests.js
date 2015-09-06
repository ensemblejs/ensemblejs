'use strict';

var expect = require('expect');
var sinon = require('sinon');
var defer = require('../../support').defer;
var plugins = require('../../support').plugin();

var window = {
  clearAnimationFrame: sinon.spy(),
  requestAnimationFrame: sinon.spy()
};
var on = {
  renderFrame: sinon.spy()
};
var currentState = {
  get: function () { return true; }
};

function unpauseGame () {
  currentState.get = function () { return false; };
}

var ms = 0;
var time = {
  present: function () { return ms; }
};
 function advanceTime (by) { ms += by; }

describe('the update loop', function () {
  var startUpdateLoop;
  var stopUpdateLoop;

  describe('when paused', function () {
    beforeEach(function () {
      window.requestAnimationFrame.reset();

      startUpdateLoop = require('../../../src/core/client/render').func(defer(window), defer(on), defer(currentState), defer(time), defer(plugins.define));

      stopUpdateLoop = plugins.deps().OnDisconnect();

      startUpdateLoop();
    });

    afterEach(function () {
      stopUpdateLoop();
    });

    it('it should reschedule itself', function () {
      expect(window.requestAnimationFrame.called).toBe(true);
    });
  });

  describe('on OnDisconnect', function () {
    beforeEach(function () {
      window.clearAnimationFrame.reset();

      startUpdateLoop = require('../../../src/core/client/render').func(defer(window), defer(on), defer(currentState), defer(time), defer(plugins.define));

      stopUpdateLoop = plugins.deps().OnDisconnect();
      startUpdateLoop();
      stopUpdateLoop();
    });

    it('should clear the animation frame', function () {
      expect(window.clearAnimationFrame.called).toBe(true);
    });
  });

  describe('when running', function () {
    beforeEach(function () {
      unpauseGame();

      on.renderFrame.reset();

      startUpdateLoop = require('../../../src/core/client/render').func(defer(window), defer(on), defer(currentState), defer(time), defer(plugins.define));
      stopUpdateLoop = plugins.deps().OnDisconnect();

      startUpdateLoop();
    });

    afterEach(function () {
      stopUpdateLoop();
    });

    it('should reschedule itself', function () {
      expect(window.requestAnimationFrame.called).toBe(true);
    });

    it('should pass frame delta to OnRenderFrame handlers', function () {
      advanceTime(43);
      startUpdateLoop();
      stopUpdateLoop();
      expect(on.renderFrame.lastCall.args).toEqual([0.043]);
    });

    it('should consider paused frames when calculating the time since last frame', function() {

      advanceTime(43);
      startUpdateLoop();
      stopUpdateLoop();
      unpauseGame();
      advanceTime(23);
      startUpdateLoop();
      stopUpdateLoop();

      expect(on.renderFrame.lastCall.args).toEqual([0.023]);
    });
  });
});