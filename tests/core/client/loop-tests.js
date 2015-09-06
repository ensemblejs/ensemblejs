'use strict';

var expect = require('expect');
var sinon = require('sinon');
var defer = require('../../support').defer;
var plugins = require('../../support').plugin();

var window = {
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
      startUpdateLoop = require('../../../src/core/client/render').func(defer(window), defer(on), defer(currentState), defer(time), defer(plugins.define));

      stopUpdateLoop = plugins.deps().OnDisconnect();
      stopUpdateLoop();
      window.requestAnimationFrame.reset();
      startUpdateLoop();
    });

    it('should stop calling request animation frame', function () {
      expect(window.requestAnimationFrame.called).toBe(false);
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