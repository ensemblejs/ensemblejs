'use strict';

const expect = require('expect');
const sinon = require('sinon');
const defer = require('../../support').defer;
const plugin = require('../../support').plugin();
const module = '../../../src/state/server/tracker';

let tracker;
const rawStateAccess = {
  get: sinon.spy(),
  all: sinon.spy(),
  resetTo: sinon.spy()
};

function forceCurrentRawState (saveStates) {
  rawStateAccess.all = function () {
    let allState = {};

    saveStates.forEach(saveState => {
      allState[saveState[0]] = { all: () => saveState[1] };
    });

    return allState;
  };
}

describe('Server StateTracker', function () {
  let callback = sinon.spy();
  let callback2 = sinon.spy();
  let afterPhysicsFrame;
  let deps;

  beforeEach(function () {
    callback.reset();
    callback2.reset();
    plugin.reset();
    tracker = require(module).func(defer(plugin.define), defer(rawStateAccess)).for(1);

    deps = plugin.deps();
    afterPhysicsFrame = deps.AfterPhysicsFrame();
  });

  describe('on save ready', () => {
    it('should do things');
  });

  describe('after each physics frame', () => {
    it('should do things');
  });

  describe('handling multiple games', function () {
    let game1Callback = sinon.spy();
    let game2Callback = sinon.spy();
    let t1;
    let t2;

    beforeEach(function () {
      tracker = require(module).func(defer(plugin.define), defer(rawStateAccess));
      deps = plugin.deps();
      afterPhysicsFrame = deps.AfterPhysicsFrame();
      t1 = tracker.for(1);
      t2 = tracker.for(2);

      forceCurrentRawState([
        [1, { property: 'unchanged' }],
        [2, { property: 'unchanged' }]
      ]);
      afterPhysicsFrame();

      t1.onChangeOf('property', game1Callback);
      t2.onChangeOf('property', game2Callback);

      game1Callback.reset();
      game2Callback.reset();
    });

    it('should ignore state changes in other games', function () {
      forceCurrentRawState([
        [1, { property: 'unchanged' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(false);
      expect(game2Callback.calledOnce).toBe(true);

      game1Callback.reset();
      game2Callback.reset();

      forceCurrentRawState([
        [1, { property: 'changed' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(true);
      expect(game2Callback.calledOnce).toBe(false);
    });
  });
});