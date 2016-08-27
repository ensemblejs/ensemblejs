'use strict';

const expect = require('expect');
const sinon = require('sinon');
const requirePlugin = require('../../support').requirePlugin;
const capture = require('../../support').capture();

const rawStateAccess = {
  get: sinon.spy(),
  all: sinon.spy(),
  resetTo: sinon.spy()
};

function forceCurrentRawState (saveStates) {
  rawStateAccess.all = function () {
    const allState = {};

    saveStates.forEach((saveState) => {
      allState[saveState[0]] = { all: () => saveState[1] };
    });

    return allState;
  };
}

const updateState = sinon.spy();
const detectChangesAndNotifyObservers = sinon.spy();

requirePlugin('state/server/tracker', {
  RawStateAccess: rawStateAccess
}, {
  '../src/util/state-change-events-immutable': () => ({
    updateState, detectChangesAndNotifyObservers
  }),
  '../src/': capture.define
});

const onSaveReady = capture.deps().OnSaveReady();
const afterPhysicsFrame = capture.deps().AfterPhysicsFrame();

describe('Server StateTracker', function () {
  const callback = sinon.spy();
  const callback2 = sinon.spy();

  beforeEach(function () {
    callback.reset();
    callback2.reset();

    forceCurrentRawState([
      [1, { property: 'aaaa' }],
      [2, { property: 'bbbb' }]
    ]);

    updateState.reset();
  });

  describe('on save ready', () => {
    it('should sync each save with the raw state', () => {
      onSaveReady();

      expect(updateState.firstCall.args).toEqual([{property: 'aaaa'}]);
      expect(updateState.secondCall.args).toEqual([{property: 'bbbb'}]);
    });
  });

  describe('after each physics frame', () => {
    it('should sync each save with the raw state', () => {
      afterPhysicsFrame();

      expect(updateState.firstCall.args).toEqual([{property: 'aaaa'}]);
      expect(updateState.secondCall.args).toEqual([{property: 'bbbb'}]);
    });

    it('should detect changes and notify observers', () => {
      expect(detectChangesAndNotifyObservers.callCount).toEqual(2);
    });
  });
});